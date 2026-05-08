import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Config } from './config';

export interface User {
    userId: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    status?: string;
    createdAt?: string;
    [key: string]: unknown;
}

export interface CreateUserRequest {
    userId?: string;
    name: string;
    email: string;
    phone?: string;
    role?: string;
    status?: string;
    [key: string]: unknown;
}

export interface UpdateUserRequest {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    status?: string;
    [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
    private http = inject(HttpClient);

    private authHeaders(): HttpHeaders {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    }

    private get baseUrl(): string {
        return Config.getUsersBaseUrl();
    }

    listUsers(): Observable<User[]> {
        return this.http.get<User[]>(this.baseUrl, { headers: this.authHeaders() });
    }

    getUserById(userId: string): Observable<User> {
        return this.http.get<User>(`${this.baseUrl}/${encodeURIComponent(userId)}`, { headers: this.authHeaders() });
    }

    createUser(payload: CreateUserRequest): Observable<User> {
        return this.http.post<User>(this.baseUrl, payload, { headers: this.authHeaders() });
    }

    updateUser(userId: string, payload: UpdateUserRequest): Observable<User> {
        return this.http.put<User>(`${this.baseUrl}/${encodeURIComponent(userId)}`, payload, { headers: this.authHeaders() });
    }

    deleteUser(userId: string): Observable<{ message: string; userId: string }> {
        return this.http.delete<{ message: string; userId: string }>(`${this.baseUrl}/${encodeURIComponent(userId)}`, { headers: this.authHeaders() });
    }
}
