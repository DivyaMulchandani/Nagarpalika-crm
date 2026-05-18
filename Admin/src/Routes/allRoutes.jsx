import { Navigate } from "react-router-dom";
import Login from "../pages/Authentication/Login";
import UserProfile from "../pages/Authentication/user-profile";
import CompanyDetails from "../pages/Setup/CompanyDetails";
import Department from "../pages/Setup/Department";
import DepartmentForm from "../pages/Setup/DepartmentForm";
import Employee from "../pages/Setup/Employee";
import EmployeeForm from "../pages/Setup/EmployeeForm";
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
import MasterData from "../pages/MasterData/MasterData";
import MasterDataForm from "../pages/MasterData/MasterDataForm";
import Reports from "../pages/Reports/Reports";
import WhatsAppMessages from "../pages/WhatsApp/WhatsAppMessages";

const authProtectedRoutes = [
    { path: "/profile",         component: <UserProfile /> },
    { path: "/dashboard",       component: <Dashboard /> },
    { path: "/company-details", component: <CompanyDetails /> },

    // Department
    { path: "/department",          component: <Department /> },
    { path: "/department/add",      component: <DepartmentForm /> },
    { path: "/department/:id",      component: <DepartmentForm /> },
    { path: "/department/:id/edit", component: <DepartmentForm /> },

    // Admin Users
    { path: "/employee",          component: <Employee /> },
    { path: "/employee/add",      component: <EmployeeForm /> },
    { path: "/employee/:id",      component: <EmployeeForm /> },
    { path: "/employee/:id/edit", component: <EmployeeForm /> },

    // Admin Roles (permission matrix)
    { path: "/employee-roles", component: <EmployeeRoles /> },

    // Location Master
    { path: "/country",          component: <Country /> },
    { path: "/country/add",      component: <CountryForm /> },
    { path: "/country/:id",      component: <CountryForm /> },
    { path: "/country/:id/edit", component: <CountryForm /> },

    { path: "/state",          component: <State /> },
    { path: "/state/add",      component: <StateForm /> },
    { path: "/state/:id",      component: <StateForm /> },
    { path: "/state/:id/edit", component: <StateForm /> },

    { path: "/city",          component: <City /> },
    { path: "/city/add",      component: <CityForm /> },
    { path: "/city/:id",      component: <CityForm /> },
    { path: "/city/:id/edit", component: <CityForm /> },

    // Email / CMS
    { path: "/email-setup",    component: <EmailSetup /> },
    { path: "/email-for",      component: <EmailFor /> },
    { path: "/email-template", component: <EmailTemplate /> },

    // Access Control
    { path: "/menu-group",          component: <MenuGroup /> },
    { path: "/menu-group/add",      component: <MenuGroupForm /> },
    { path: "/menu-group/:id",      component: <MenuGroupForm /> },
    { path: "/menu-group/:id/edit", component: <MenuGroupForm /> },

    { path: "/menu-master",          component: <MenuMaster /> },
    { path: "/menu-master/add",      component: <MenuMasterForm /> },
    { path: "/menu-master/:id",      component: <MenuMasterForm /> },
    { path: "/menu-master/:id/edit", component: <MenuMasterForm /> },

    { path: "/role-master",          component: <RoleMaster /> },
    { path: "/role-master/add",      component: <RoleMasterForm /> },
    { path: "/role-master/:id",      component: <RoleMasterForm /> },
    { path: "/role-master/:id/edit", component: <RoleMasterForm /> },

    // Master Data
    { path: "/master-data",          component: <MasterData /> },
    { path: "/master-data/add",      component: <MasterDataForm /> },
    { path: "/master-data/:id",      component: <MasterDataForm /> },
    { path: "/master-data/:id/edit", component: <MasterDataForm /> },

    // Notifications & Reports
    { path: "/whatsapp", component: <WhatsAppMessages /> },
    { path: "/reports",  component: <Reports /> },

    { path: "/",  exact: true, component: <Navigate to="/dashboard" /> },
    { path: "*",  component: <Navigate to="/dashboard" /> },
];

const publicRoutes = [
    { path: "/", component: <Login /> },
];

export { authProtectedRoutes, publicRoutes };
