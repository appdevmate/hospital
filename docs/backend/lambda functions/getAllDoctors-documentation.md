# `getAllDoctors` — Lambda Function Documentation

> **Runtime:** Node.js (AWS Lambda) · **Region:** us-east-1 · **Table:** Hospital · **SDK:** AWS SDK v3

---

## 1. Overview

This Lambda function retrieves doctor records from a DynamoDB table called `Hospital`. It supports pagination, sorting, filtering, and a single-doctor lookup by ID — all through query string parameters passed via an API Gateway GET request.

When called, the function:
- Reads optional query parameters from the request.
- Builds a DynamoDB filter expression to match only active doctor records.
- Scans the table and returns a page of results.
- Also returns the total count of matching records.

---

## 2. Entry Point — `exports.handler`

This is the main function AWS Lambda calls when a request arrives. Think of it as the front door of the function.

```js
exports.handler = async (event) => {
  // 1. Check if a single doctorID is in the URL path
  // 2. Parse query parameters (pageSize, offset, sortField, filters...)
  // 3. Build the DynamoDB filter expression
  // 4. Run the scan (unsorted or sorted)
  // 5. Get the total count
  // 6. Return the result
};
```

**Single doctor lookup:** If the URL contains a `doctorID` path parameter, the function calls `getDoctorById()` and returns immediately — skipping pagination entirely.

---

## 3. Supported Query Parameters

All parameters are optional. They are read from the URL query string (e.g. `?pageSize=10&sortField=name`).

| Parameter | Description |
|---|---|
| `pageSize` | Number of results per page. Default: 25. Range: 1–100. |
| `offset` | Number of records to skip from the beginning. Default: 0. |
| `sortField` | Field to sort by (e.g. `name`, `dob`, `hiringDate`, `status`). If omitted, no sorting is applied. |
| `sortOrder` | Sort direction. Use `-1` for descending, any other value for ascending. |
| `lastKey` | Pagination cursor from the previous response. Used to fetch the next page. |
| `name`, `gender`, `department`, ... | Individual field filters. Supports operators like `.contains`, `.equals`, `.startsWith`. |
| `dobFrom` / `dobTo` | Date range filter for date of birth. |
| `hiringDateFrom` / `hiringDateTo` | Date range filter for hiring date. |
| `search` | Global search across name, gender, department, specialization, email, and more. |

---

## 4. Filter Operators

Filters are passed as `field.operator=value` in the query string.
For example: `name.startsWith=Ali` or `status.equals=active`.

| Operator | Behavior |
|---|---|
| `contains` | Field contains the value (default if no operator specified) |
| `notContains` | Field does NOT contain the value |
| `equals` | Field exactly matches the value (supports comma-separated list → IN clause) |
| `notEquals` | Field does not match the value (supports comma-separated list) |
| `startsWith` | Field begins with the value |
| `endsWith` | Field contains the value *(DynamoDB limitation — same as contains)* |

**Multi-value example:** `department.equals=Cardiology,Neurology` returns doctors in either department.

---

## 5. How DynamoDB Scanning Works

DynamoDB does not support SQL-style queries on arbitrary fields. Instead, the function uses a **Scan** operation — it reads all items and filters them in real-time using a filter expression.

Every scan always filters for:
- `PK` starts with `DOCTOR#`
- `SK` = `PROFILE`
- `EntityType` = `DOCTOR`
- Record is **NOT soft-deleted** (`deletedAt` is absent or null)

**Soft delete check:** A doctor is considered deleted only if their `deletedAt` field holds a real, non-empty value. Empty strings, the word `"null"`, or missing attributes are all treated as "not deleted" — so the record stays visible.

---

## 6. Scan Paths — Sorted vs. Unsorted

The function has two scan strategies depending on whether a `sortField` is provided.

### 6.1 Unsorted Scan — `scanUnsorted()`

Used when no `sortField` is given. The function scans DynamoDB page by page, collecting doctors until it has enough to fill one page. It stops as soon as it reaches the `pageSize` limit.

- Efficient — stops early once the page is full.
- Uses a DynamoDB `ExclusiveStartKey` (`lastKey`) to resume from a saved position.
- Runs up to 50 scan iterations to avoid infinite loops.

### 6.2 Sorted Scan — `scanSorted()`

Used when a `sortField` is provided. Because DynamoDB cannot sort during a scan, the function collects all matching records into an in-memory buffer first, then sorts them manually using JavaScript.

- Loads more records into memory before returning results.
- Sorting is done in-place using a custom compare function.
- Cursor-based pagination: instead of a DynamoDB key, it uses a `cursor` object that records the last seen sort value and PK, so the next page continues from the correct position.

---

## 7. `normalizeDoctor()` — Shaping the Output

Every DynamoDB item is passed through `normalizeDoctor()` before being returned. This function cleans up the raw item and ensures a consistent output shape.

```js
function normalizeDoctor(it) {
  const { PK, SK, EntityType, deletedAt, ...rest } = it;
  return {
    PK, SK,
    name: it.name || '',
    email: it.email || '',
    gender: it.gender || '',
    bloodGroup: it.bloodGroup || '',
    department: it.department || '',
    // ... all other fields
    ...rest  // any future fields are included automatically
  };
}
```

**Key behavior:** Internal DynamoDB keys (`PK`, `SK`, `EntityType`, `deletedAt`) are stripped from the spread, so they do not appear twice. The `...rest` spread ensures any field added to DynamoDB in the future will automatically be included in the response without needing to update this function.

---

## 8. Single Doctor Lookup — `getDoctorById()`

When a `doctorID` path parameter is present in the request, the function does a direct DynamoDB `GetItem` call using the exact key `DOCTOR#<id>` instead of a full scan.

```js
Key: { PK: `DOCTOR#${id}`, SK: 'PROFILE' }

// No ProjectionExpression → all attributes are returned
```

No `ProjectionExpression` is used, so every attribute stored on the record is returned. The result is passed through `normalizeDoctor()` and returned immediately — no pagination is involved.

---

## 9. Total Count — `getFilteredCount()`

The function always returns a `totalCount` alongside the page data, so the frontend knows how many records exist in total.

- **When no filters are active:** It runs a DynamoDB scan with `Select: COUNT` — this is cheaper than reading all items because DynamoDB counts without returning the data.
- **When filters are active:** It runs the same filtered scan with `Select: COUNT` to get the exact count of matching records.

The count scan loops through all DynamoDB pages (using `LastEvaluatedKey`) to ensure it counts every record, not just the first batch.

---

## 10. Pagination

The function uses two different pagination strategies depending on the scan mode.

| Mode | Pagination Strategy |
|---|---|
| Unsorted | DynamoDB native `ExclusiveStartKey`. Pass the `lastKey` from the previous response to get the next page. |
| Sorted | Cursor-based. The `lastKey` contains the last seen sort value and PK. The next scan filters out everything before that cursor position. |

The response includes a `hasMore` boolean and a `lastKey` value. If `hasMore` is `true`, pass the `lastKey` back as a query parameter to retrieve the next page.

---

## 11. Response Structure

On success, the function returns **HTTP 200** with the following JSON body:

```json
{
  "message": "Doctors retrieved successfully",
  "data": [ ...array of doctor objects... ],
  "count": 25,
  "totalCount": 142,
  "pageSize": 25,
  "hasMore": true,
  "lastKey": "..."
}
```

| Field | Description |
|---|---|
| `data` | Array of doctor objects for the current page |
| `count` | Number of records in this page |
| `totalCount` | Total matching records across all pages |
| `pageSize` | The requested page size |
| `hasMore` | Whether more pages exist |
| `lastKey` | Cursor for the next page (`null` if no more) |

On error, the function returns **HTTP 500** with a `message` field describing the problem.

---

## 12. Allowed Sort Fields

To prevent injection or invalid sort requests, only the following fields are accepted as `sortField` values. Any other value is silently ignored and results are returned unsorted.

| Field | Type / Notes |
|---|---|
| `name` | String — alphabetical sort |
| `gender` | String — alphabetical sort |
| `insurance` | String — alphabetical sort |
| `department` | String — alphabetical sort |
| `specialization` | String — alphabetical sort |
| `status` | String — alphabetical sort |
| `dob` | Date — parsed to timestamp for accurate comparison |
| `hiringDate` | Date — parsed to timestamp for accurate comparison |
| `timestamp` | Date — parsed to timestamp for accurate comparison |
| `experienceYears` | String (treated as text for sorting) |
| `experienceMonths` | String (treated as text for sorting) |
| `education` | String — alphabetical sort |
| `dutyDays` | String — alphabetical sort |
| `dutyStart` | String — alphabetical sort |
| `dutyEnd` | String — alphabetical sort |
| `notes` | String — alphabetical sort |

---

## 13. Helper Functions Summary

| Function | Purpose |
|---|---|
| `parseLastKey(raw)` | Decodes and parses the pagination cursor from the query string. |
| `sanitizeSortField(field)` | Validates that the requested sort field is in the allowed list. |
| `parseFilterParameters(qp)` | Reads all filter-related query params and organizes them into a structured `filters` object. |
| `buildFilterExpression(filters)` | Converts the filters object into a DynamoDB-compatible `FilterExpression` string with attribute names and values. |
| `buildFilterCondition(...)` | Builds a single DynamoDB condition clause for one field and operator. |
| `scanUnsorted(...)` | Runs the DynamoDB scan without sorting; returns a page of results. |
| `scanSorted(...)` | Runs the DynamoDB scan, buffers all results, sorts them, and returns a page. |
| `sortArray(arr, field, order)` | Sorts an array of doctor objects by a given field and direction. |
| `sortValueOf(item, field)` | Extracts the sortable value from a doctor object (handles date parsing for date fields). |
| `afterCursor(sorted, cursor, ...)` | Filters out records that come before the pagination cursor position. |
| `normalizeDoctor(it)` | Maps a raw DynamoDB item into a clean, consistent doctor response object. |
| `isDeleted(it)` | Returns `true` only if `deletedAt` contains a real, non-empty value. |
| `getFilteredCount(filters)` | Returns the total count of matching doctors across all pages. |
| `countByScan(filters)` | Runs a COUNT-only scan over all DynamoDB pages for the given filter. |
| `clampInt(val, def, min, max)` | Safely parses an integer from a string, applying a default and min/max bounds. |
| `ok(body)` | Returns an HTTP 200 response with CORS headers and a JSON body. |
| `errResp(status, message)` | Returns an error HTTP response with a JSON message. |

---

## 14. Data Flow — Step by Step

| Step | What Happens |
|---|---|
| 1 | API Gateway triggers the Lambda and passes the `event` object containing path parameters and query strings. |
| 2 | `handler()` checks for a `doctorID` path param. If found, `getDoctorById()` is called and the function returns immediately. |
| 3 | Query parameters are parsed: `pageSize`, `offset`, `sortField`, `sortOrder`, `lastKey`, and all filters. |
| 4 | `buildFilterExpression()` converts filters into a DynamoDB-compatible `FilterExpression`. |
| 5 | If no `sortField`: `scanUnsorted()` is called. If `sortField` is set: `scanSorted()` is called. |
| 6 | Each matching DynamoDB item is passed through `normalizeDoctor()` to produce a clean response shape. |
| 7 | `getFilteredCount()` runs a separate COUNT scan to determine the total number of matching records. |
| 8 | The final response is assembled with `data`, `count`, `totalCount`, `hasMore`, and `lastKey`, then returned as HTTP 200. |

---

## 15. Important Notes & Limitations

- **DynamoDB Scan cost:** Every call performs a full table scan. This is fine for small tables but becomes expensive and slow as the table grows. Consider using a GSI (Global Secondary Index) for production scale.
- **Sorted scans load more data:** When sorting is requested, the function must load all matching records into memory before it can sort and paginate. This increases memory usage and response time.
- **`endsWith` is approximate:** DynamoDB does not natively support suffix matching. The `endsWith` operator falls back to a `contains` check.
- **Max scan iterations:** Both scan functions cap at 50 iterations to prevent runaway loops. If a dataset is very large and heavily filtered, some records may be missed.
- **CORS:** All responses include `Access-Control-Allow-Origin: *` headers, allowing any frontend origin to call this API.
- **Soft deletes:** Doctors are never physically removed. Setting `deletedAt` to a real timestamp hides them from all queries. `null`, empty string, or the string `"null"` are all treated as not deleted.

---

*getAllDoctors Lambda · Hospital Management System · AWS DynamoDB*
