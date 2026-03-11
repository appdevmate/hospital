// import { Component } from '@angular/core';
// import { LayoutService } from '@/layout/service/layout.service';
// import { inject } from '@angular/core';

// @Component({
//     standalone: true,
//     selector: 'stats-saas-widget',
//     template: `<div class="col-span-12 md:col-span-6 xl:col-span-3">
//             <div class="card p-0! overflow-hidden flex flex-col">
//                 <div class="flex items-center p-6">
//                     <i class="pi pi-users text-5xl! text-blue-500"></i>
//                     <div class="ml-6">
//                         <span class="text-blue-500 block whitespace-nowrap">USERS SIGNED UP</span>
//                         <span class="text-blue-500 block text-4xl font-bold">3882</span>
//                     </div>
//                 </div>
//                 <img [src]="setSvg('users')" class="w-full" alt="users" />
//             </div>
//         </div>
//         <div class="col-span-12 md:col-span-6 xl:col-span-3">
//             <div class="card p-0! overflow-hidden flex flex-col">
//                 <div class="flex items-center p-6">
//                     <i class="pi pi-map text-5xl! text-orange-500"></i>
//                     <div class="ml-6">
//                         <span class="text-orange-500 block whitespace-nowrap">LIFETIME VALUE</span>
//                         <span class="text-orange-500 block text-4xl font-bold">532</span>
//                     </div>
//                 </div>
//                 <img [src]="setSvg('locations')" class="w-full" alt="locations" />
//             </div>
//         </div>
//         <div class="col-span-12 md:col-span-6 xl:col-span-3">
//             <div class="card p-0! overflow-hidden flex flex-col">
//                 <div class="flex items-center p-6">
//                     <i class="pi pi-directions text-5xl! text-green-500"></i>
//                     <div class="ml-6">
//                         <span class="text-green-500 block whitespace-nowrap">CONVERSION RATE</span>
//                         <span class="text-green-500 block text-4xl font-bold">12.6%</span>
//                     </div>
//                 </div>
//                 <img [src]="setSvg('rate')" class="w-full" alt="conversion" />
//             </div>
//         </div>
//         <div class="col-span-12 md:col-span-6 xl:col-span-3">
//             <div class="card h-full p-0! overflow-hidden flex flex-col">
//                 <div class="flex items-center p-6">
//                     <i class="pi pi-comments text-5xl! text-purple-500"></i>
//                     <div class="ml-6">
//                         <span class="text-purple-500 block whitespace-nowrap">ACTIVE TRIALS</span>
//                         <span class="text-purple-500 block text-4xl font-bold">440</span>
//                     </div>
//                 </div>
//                 <img [src]="setSvg('interactions')" class="w-full mt-auto" alt="interactions" />
//             </div>
//         </div>`,
//     host: {
//         style: 'display: contents;'
//     }
// })
// export class StatsSaasWidget {
//     layoutService = inject(LayoutService);

//     setSvg(path: string) {
//         return `/demo/images/dashboard/${path}` + (this.layoutService.isDarkTheme() ? '-dark' : '') + '.svg';
//     }
// }
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutService } from '@/layout/service/layout.service';
import { inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';
import { DoctorsService } from '@/pages/service/doctors.service';
import { PatientsService } from '@/pages/service/patients.service';
import { AppointmentsService } from '@/pages/service/appointments.service';

@Component({
    standalone: true,
    selector: 'stats-saas-widget',
    imports: [CommonModule],
    template: `
        <div class="col-span-12 md:col-span-6 xl:col-span-3">
            <div class="card p-0! overflow-hidden flex flex-col">
                <div class="flex items-center p-6">
                    <i class="pi pi-user-plus text-5xl! text-blue-500"></i>
                    <div class="ml-6">
                        <span class="text-blue-500 block whitespace-nowrap">TOTAL DOCTORS</span>
                        <span class="text-blue-500 block text-4xl font-bold">{{ loading ? '...' : doctors }}</span>
                    </div>
                </div>
                <img [src]="setSvg('users')" class="w-full" alt="doctors" />
            </div>
        </div>

        <div class="col-span-12 md:col-span-6 xl:col-span-3">
            <div class="card p-0! overflow-hidden flex flex-col">
                <div class="flex items-center p-6">
                    <i class="pi pi-users text-5xl! text-orange-500"></i>
                    <div class="ml-6">
                        <span class="text-orange-500 block whitespace-nowrap">TOTAL PATIENTS</span>
                        <span class="text-orange-500 block text-4xl font-bold">{{ loading ? '...' : patients }}</span>
                    </div>
                </div>
                <img [src]="setSvg('locations')" class="w-full" alt="patients" />
            </div>
        </div>

        <div class="col-span-12 md:col-span-6 xl:col-span-3">
            <div class="card p-0! overflow-hidden flex flex-col">
                <div class="flex items-center p-6">
                    <i class="pi pi-calendar text-5xl! text-green-500"></i>
                    <div class="ml-6">
                        <span class="text-green-500 block whitespace-nowrap">TOTAL APPOINTMENTS</span>
                        <span class="text-green-500 block text-4xl font-bold">{{ loading ? '...' : appointments }}</span>
                    </div>
                </div>
                <img [src]="setSvg('rate')" class="w-full" alt="appointments" />
            </div>
        </div>

        <div class="col-span-12 md:col-span-6 xl:col-span-3">
            <div class="card h-full p-0! overflow-hidden flex flex-col">
                <div class="flex items-center p-6">
                    <i class="pi pi-calendar-clock text-5xl! text-purple-500"></i>
                    <div class="ml-6">
                        <span class="text-purple-500 block whitespace-nowrap">TODAY'S APPOINTMENTS</span>
                        <span class="text-purple-500 block text-4xl font-bold">{{ loading ? '...' : todayAppointments }}</span>
                    </div>
                </div>
                <img [src]="setSvg('interactions')" class="w-full mt-auto" alt="today" />
            </div>
        </div>
    `,
    host: { style: 'display: contents;' }
})
export class StatsSaasWidget implements OnInit {
    layoutService = inject(LayoutService);
    loading = true;
    doctors = 0;
    patients = 0;
    appointments = 0;
    todayAppointments = 0;

    constructor(
        private doctorsService: DoctorsService,
        private patientsService: PatientsService,
        private appointmentsService: AppointmentsService
    ) {}

    setSvg(path: string) {
        return `/demo/images/dashboard/${path}` + (this.layoutService.isDarkTheme() ? '-dark' : '') + '.svg';
    }

    ngOnInit() {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        forkJoin({
            doctors: this.doctorsService.getDoctorsPage({ pageSize: 1 }).pipe(catchError(() => of({ totalCount: 0 }))),
            patients: this.patientsService.getPatientsPage({ pageSize: 1 }).pipe(catchError(() => of({ totalCount: 0 }))),
            appointments: this.appointmentsService.getAppointments().pipe(catchError(() => of([])))
        }).subscribe(({ doctors, patients, appointments }) => {
            this.doctors = (doctors as any).totalCount || 0;
            this.patients = (patients as any).totalCount || 0;
            this.appointments = (appointments as any[]).length;
            this.todayAppointments = (appointments as any[]).filter((a) => a.date === todayStr).length;
            this.loading = false;
        });
    }
}
