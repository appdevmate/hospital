import { __decorate } from "tslib";
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Config } from '@/pages/service/config';
// ── Service ───────────────────────────────────────────────────────────────────
let ExaminationService = class ExaminationService {
    http = inject(HttpClient);
    headers() {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`
        });
    }
    createExamination(data) {
        return this.http.post(Config.buildUrl('examinations'), data, { headers: this.headers() });
    }
    listExaminations(patientId) {
        const params = new HttpParams().set('patientId', patientId);
        return this.http.get(Config.buildUrl('examinations'), { headers: this.headers(), params });
    }
    getExamination(examId) {
        return this.http.get(Config.buildUrl(`examinations/${examId}`), { headers: this.headers() });
    }
    updateSection(examId, section, data) {
        return this.http.patch(Config.buildUrl(`examinations/${examId}`), { [section]: data }, { headers: this.headers() });
    }
    signOff(examId) {
        return this.http.post(Config.buildUrl(`examinations/${examId}/signoff`), {}, { headers: this.headers() });
    }
    deleteExamination(examId) {
        return this.http.delete(Config.buildUrl(`examinations/${examId}`), { headers: this.headers() });
    }
};
ExaminationService = __decorate([
    Injectable({ providedIn: 'root' })
], ExaminationService);
export { ExaminationService };
