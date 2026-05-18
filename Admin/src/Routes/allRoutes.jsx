import { Navigate } from "react-router-dom";
import Login from "../pages/Authentication/Login";
import UserProfile from "../pages/Authentication/user-profile";
import CompanyDetails from "../pages/Setup/CompanyDetails";
import Department from "../pages/Setup/Department";
import DepartmentForm from "../pages/Setup/DepartmentForm";
import Doctor from "../pages/Setup/Doctor";
import DoctorForm from "../pages/Setup/DoctorForm";
import Employee from "../pages/Setup/Employee";
import EmployeeForm from "../pages/Setup/EmployeeForm";
import Patients from "../pages/Patient/Patients";
import PatientForm from "../pages/Patient/PatientForm";
import PatientDetail from "../pages/Patient/PatientDetail";
import Country from "../pages/Master/Country";
import CountryForm from "../pages/Master/CountryForm";
import State from "../pages/Master/State";
import StateForm from "../pages/Master/StateForm";
import City from "../pages/Master/City";
import CityForm from "../pages/Master/CityForm";
import EmailSetup from "../pages/CMS/EmailSetup";
import EmailFor from "../pages/CMS/EmailFor";
import EmailTemplate from "../pages/CMS/EmailTemplate";
import Dashboard from "../pages/Dashboard/Dashboard";
import MenuGroup from "../pages/Master/MenuGroup";
import MenuGroupForm from "../pages/Master/MenuGroupForm";
import MenuMaster from "../pages/Master/MenuMaster";
import MenuMasterForm from "../pages/Master/MenuMasterForm";
import EmployeeRoles from "../pages/Setup/EmployeeRoles";
import RoleMaster from "../pages/Master/RoleMaster";
import RoleMasterForm from "../pages/Master/RoleMasterForm";
import CurrencyMaster from "../pages/Master/CurrencyMaster";
import CurrencyMasterForm from "../pages/Master/CurrencyMasterForm";
import MasterData from "../pages/MasterData/MasterData";
import MasterDataForm from "../pages/MasterData/MasterDataForm";
import Appointments from "../pages/Appointment/Appointments";
import AppointmentForm from "../pages/Appointment/AppointmentForm";
import Invoices from "../pages/Invoice/Invoices";
import InvoiceForm from "../pages/Invoice/InvoiceForm";
import Reports from "../pages/Reports/Reports";
import WhatsAppMessages from "../pages/WhatsApp/WhatsAppMessages";
import DoctorConsultation from "../pages/Consultation/DoctorConsultation";
import FollowUpQueue from "../pages/Appointment/FollowUpQueue";

const authProtectedRoutes = [
    { path: "/profile", component: <UserProfile /> },
    { path: "/company-details", component: <CompanyDetails /> },

    // Department
    { path: "/department", component: <Department /> },
    { path: "/department/add", component: <DepartmentForm /> },
    { path: "/department/:id", component: <DepartmentForm /> },
    { path: "/department/:id/edit", component: <DepartmentForm /> },

    // Doctor
    { path: "/doctor", component: <Doctor /> },
    { path: "/doctor/add", component: <DoctorForm /> },
    { path: "/doctor/:id", component: <DoctorForm /> },
    { path: "/doctor/:id/edit", component: <DoctorForm /> },

    // Employee
    { path: "/employee", component: <Employee /> },
    { path: "/employee/add", component: <EmployeeForm /> },
    { path: "/employee/:id", component: <EmployeeForm /> },
    { path: "/employee/:id/edit", component: <EmployeeForm /> },

    // Patient
    { path: "/patients", component: <Patients /> },
    { path: "/patients/new", component: <PatientForm /> },
    { path: "/patients/:id/edit", component: <PatientForm /> },
    { path: "/patient/:id", component: <PatientDetail /> },

    // Employee Roles (special permission matrix, no add/edit sub-routes)
    { path: "/employee-roles", component: <EmployeeRoles /> },

    // Country
    { path: "/country", component: <Country /> },
    { path: "/country/add", component: <CountryForm /> },
    { path: "/country/:id", component: <CountryForm /> },
    { path: "/country/:id/edit", component: <CountryForm /> },

    // State
    { path: "/state", component: <State /> },
    { path: "/state/add", component: <StateForm /> },
    { path: "/state/:id", component: <StateForm /> },
    { path: "/state/:id/edit", component: <StateForm /> },

    // City
    { path: "/city", component: <City /> },
    { path: "/city/add", component: <CityForm /> },
    { path: "/city/:id", component: <CityForm /> },
    { path: "/city/:id/edit", component: <CityForm /> },

    // Email / CMS
    { path: "/email-setup", component: <EmailSetup /> },
    { path: "/email-for", component: <EmailFor /> },
    { path: "/email-template", component: <EmailTemplate /> },

    // Dashboard
    { path: "/dashboard", component: <Dashboard /> },

    // Menu Group
    { path: "/menu-group", component: <MenuGroup /> },
    { path: "/menu-group/add", component: <MenuGroupForm /> },
    { path: "/menu-group/:id", component: <MenuGroupForm /> },
    { path: "/menu-group/:id/edit", component: <MenuGroupForm /> },

    // Menu Master
    { path: "/menu-master", component: <MenuMaster /> },
    { path: "/menu-master/add", component: <MenuMasterForm /> },
    { path: "/menu-master/:id", component: <MenuMasterForm /> },
    { path: "/menu-master/:id/edit", component: <MenuMasterForm /> },

    // Role Master
    { path: "/role-master", component: <RoleMaster /> },
    { path: "/role-master/add", component: <RoleMasterForm /> },
    { path: "/role-master/:id", component: <RoleMasterForm /> },
    { path: "/role-master/:id/edit", component: <RoleMasterForm /> },

    // Currency Master
    { path: "/currency-master", component: <CurrencyMaster /> },
    { path: "/currency-master/add", component: <CurrencyMasterForm /> },
    { path: "/currency-master/:id", component: <CurrencyMasterForm /> },
    { path: "/currency-master/:id/edit", component: <CurrencyMasterForm /> },

    // Appointments
    { path: "/appointments", component: <Appointments /> },
    { path: "/appointments/add", component: <AppointmentForm /> },
    { path: "/appointments/:id", component: <AppointmentForm /> },
    { path: "/appointments/:id/edit", component: <AppointmentForm /> },

    // Invoices
    { path: "/invoices", component: <Invoices /> },
    { path: "/invoices/add", component: <InvoiceForm /> },
    { path: "/invoices/:id", component: <InvoiceForm /> },
    { path: "/invoices/:id/edit", component: <InvoiceForm /> },

    // Consultation (Doctor)
    { path: "/consultation/:id", component: <DoctorConsultation /> },

    // Follow-Up Queue
    { path: "/follow-up-queue", component: <FollowUpQueue /> },

    // Reports
    { path: "/reports", component: <Reports /> },

    // WhatsApp
    { path: "/whatsapp", component: <WhatsAppMessages /> },

    // Master Data
    { path: "/master-data", component: <MasterData /> },
    { path: "/master-data/add", component: <MasterDataForm /> },
    { path: "/master-data/:id", component: <MasterDataForm /> },
    { path: "/master-data/:id/edit", component: <MasterDataForm /> },

    {
        path: "/",
        exact: true,
        component: <Navigate to="/dashboard" />,
    },
    { path: "*", component: <Navigate to="/dashboard" /> },
];

const publicRoutes = [
    { path: "/", component: <Login /> },
];

export { authProtectedRoutes, publicRoutes };
