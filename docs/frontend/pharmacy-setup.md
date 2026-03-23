# Pharmacy Module — Setup Instructions

## 1. Cognito — Add Pharmacists Group
AWS Console → Cognito → User Pool (us-east-1_k2smci5zb) → Groups → Create group
- Group name: Pharmacists
- Add pharmacist users to this group

## 2. Lambda — tiryaq-pharmacy
- Runtime: Node.js 20.x
- Handler: pharmacy.handler
- Environment variable: TABLE_NAME = Hospital
- Same IAM role as other Hospital Lambdas (DynamoDB read/write access)

## 3. API Gateway Routes
Add to Hospital HTTP API (xy829e3qw2), all with Cognito authorizer:

| Method | Route |
|--------|-------|
| GET    | /pharmacy/medications |
| POST   | /pharmacy/medications |
| PATCH  | /pharmacy/medications/{medId} |
| DELETE | /pharmacy/medications/{medId} |
| GET    | /pharmacy/inventory |
| PATCH  | /pharmacy/inventory/{medId} |
| GET    | /pharmacy/prescriptions |
| POST   | /pharmacy/dispense |
| GET    | /pharmacy/dispense |
| GET    | /pharmacy/purchase-orders |
| POST   | /pharmacy/purchase-orders |
| PATCH  | /pharmacy/purchase-orders/{poId} |
| GET    | /pharmacy/alerts |

## 4. Angular Files
Copy to:
- src/app/components/pharmacy/pharmacy.ts
- src/app/components/pharmacy/pharmacy.html
- src/app/components/pharmacy/pharmacy.scss
- src/app/pages/service/pharmacy.service.ts

## 5. Fix pharmacy.html — Remove pipe reference
The HTML references a pipe `| stockAlerts` which doesn't exist.
Replace this line:
    @if (inventory | stockAlerts) {
With:
    @if (inventory | pipeStockAlerts) {  ← or just remove the tab badge check

Simplest fix — remove the tab badge for inventory:
    <p-tab value="2"><i class="pi pi-box mr-2"></i>Inventory</p-tab>

## 6. Routes (app.routes.ts)
```typescript
{ path: 'pharmacy', component: PharmacyComponent }
```

## 7. Menu (app.menu.ts)
Add to sharedItems (visible to all roles including Pharmacists):
```typescript
{ label: 'Pharmacy', icon: 'pi pi-heart-fill', routerLink: ['/pharmacy'] }
```

## 8. AuthService — Add isPharmacist
Add to auth.service.ts:
```typescript
get isPharmacist(): boolean {
    const groups = this.current?.groups || [];
    return groups.includes('Pharmacists');
}
```