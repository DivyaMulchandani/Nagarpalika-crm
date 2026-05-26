import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Navdata drives HorizontalLayout and TwoColumnLayout.
// VerticalLayout (main sidebar) is driven by MenuContext (DB-seeded menus).

const Navdata = () => {
    const navigate = useNavigate();

    const [isSetup, setIsSetup] = useState(false);
    const [isLocation, setIsLocation] = useState(false);
    const [isNotifications, setIsNotifications] = useState(false);
    const [isAccessControl, setIsAccessControl] = useState(false);
    const [isRecruitment, setIsRecruitment] = useState(false);

    const [iscurrentState, setIscurrentState] = useState("Dashboard");

    useEffect(() => {
        if (iscurrentState !== "Setup")         setIsSetup(false);
        if (iscurrentState !== "Location")      setIsLocation(false);
        if (iscurrentState !== "Notifications") setIsNotifications(false);
        if (iscurrentState !== "AccessControl") setIsAccessControl(false);
        if (iscurrentState !== "Recruitment")   setIsRecruitment(false);
    }, [iscurrentState]);

    const menuItems = [
        {
            id: "dashboard",
            label: "Dashboard",
            icon: "ri-dashboard-2-line",
            link: "/dashboard",
            click: (e) => { e.preventDefault(); navigate("/dashboard"); setIscurrentState("Dashboard"); },
        },
        {
            id: "setup",
            label: "Setup",
            icon: "ri-settings-3-line",
            link: "/#",
            stateVariables: isSetup,
            click: (e) => { e.preventDefault(); setIsSetup(!isSetup); setIscurrentState("Setup"); },
            subItems: [
                { id: "nagarpalikaDetails", label: "Nagar Palika Details", link: "/company-details", parentId: "setup" },
                { id: "departments",        label: "Departments",          link: "/department",       parentId: "setup" },
                { id: "adminUsers",         label: "Admin Users",          link: "/employee",         parentId: "setup" },
                { id: "adminRoles",         label: "Admin Roles",          link: "/employee-roles",   parentId: "setup" },
            ],
        },
        {
            id: "location",
            label: "Location Master",
            icon: "ri-map-pin-2-line",
            link: "/#",
            stateVariables: isLocation,
            click: (e) => { e.preventDefault(); setIsLocation(!isLocation); setIscurrentState("Location"); },
            subItems: [
                { id: "country", label: "Country", link: "/country", parentId: "location" },
                { id: "state",   label: "State",   link: "/state",   parentId: "location" },
                { id: "city",    label: "City",     link: "/city",    parentId: "location" },
            ],
        },
        {
            id: "masterData",
            label: "Master Data",
            icon: "ri-list-settings-line",
            link: "/master-data",
            click: (e) => { e.preventDefault(); navigate("/master-data"); setIscurrentState("Dashboard"); },
        },
        {
            id: "notifications",
            label: "Notifications",
            icon: "ri-notification-3-line",
            link: "/#",
            stateVariables: isNotifications,
            click: (e) => { e.preventDefault(); setIsNotifications(!isNotifications); setIscurrentState("Notifications"); },
            subItems: [
                { id: "whatsapp",       label: "WhatsApp Messages", link: "/whatsapp",       parentId: "notifications" },
                { id: "emailSetup",     label: "Email Setup",       link: "/email-setup",    parentId: "notifications" },
                { id: "emailFor",       label: "Email Types",       link: "/email-for",      parentId: "notifications" },
                { id: "emailTemplate",  label: "Email Templates",   link: "/email-template", parentId: "notifications" },
            ],
        },
        {
            id: "accessControl",
            label: "Access Control",
            icon: "ri-shield-keyhole-line",
            link: "/#",
            stateVariables: isAccessControl,
            click: (e) => { e.preventDefault(); setIsAccessControl(!isAccessControl); setIscurrentState("AccessControl"); },
            subItems: [
                { id: "roleMaster",  label: "Role Master",  link: "/role-master",  parentId: "accessControl" },
                { id: "menuMaster",  label: "Menu Master",  link: "/menu-master",  parentId: "accessControl" },
                { id: "menuGroups",  label: "Menu Groups",  link: "/menu-group",   parentId: "accessControl" },
            ],
        },
        {
            id: "recruitment",
            label: "Recruitment",
            icon: "ri-user-search-line",
            link: "/#",
            stateVariables: isRecruitment,
            click: (e) => { e.preventDefault(); setIsRecruitment(!isRecruitment); setIscurrentState("Recruitment"); },
            subItems: [
                { id: "advertisements", label: "Advertisements",  link: "/advertisements",  parentId: "recruitment" },
                { id: "candidates",     label: "Candidates",      link: "/candidates",      parentId: "recruitment" },
                { id: "applications",   label: "Applications",    link: "/applications",    parentId: "recruitment" },
                { id: "feePayments",    label: "Fee Payments",    link: "/fee-payments",    parentId: "recruitment" },
                { id: "callLetters",    label: "Call Letters",    link: "/call-letters",    parentId: "recruitment" },
                { id: "notices",        label: "Notice Board",    link: "/notices",         parentId: "recruitment" },
            ],
        },
        {
            id: "reports",
            label: "Reports",
            icon: "ri-bar-chart-box-line",
            link: "/reports",
            click: (e) => { e.preventDefault(); navigate("/reports"); setIscurrentState("Dashboard"); },
        },
    ];

    return <React.Fragment>{menuItems}</React.Fragment>;
};

export default Navdata;
