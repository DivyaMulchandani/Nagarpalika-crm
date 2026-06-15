import React, { useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import SimpleBar from "simplebar-react";
import npLogo from "../assets/images/np-logo.png";
//Import Components
import VerticalLayout from "./VerticalLayouts";
import TwoColumnLayout from "./TwoColumnLayout";
import { Container } from "reactstrap";
import HorizontalLayout from "./HorizontalLayout";
import { AuthContext } from "../context/AuthContext";

const Sidebar = ({ layoutType }) => {
    const { adminData } = useContext(AuthContext);

    useEffect(() => {
        var verticalOverlay =
            document.getElementsByClassName("vertical-overlay");
        if (verticalOverlay) {
            verticalOverlay[0].addEventListener("click", function () {
                document.body.classList.remove("vertical-sidebar-enable");
            });
        }
    });

    const addEventListenerOnSmHoverMenu = () => {
        const currentSize =
            document.documentElement.getAttribute("data-sidebar-size");

        if (currentSize === "sm-hover") {
            document.documentElement.setAttribute(
                "data-sidebar-size",
                "sm-hover-active"
            );
        } else if (currentSize === "sm-hover-active") {
            document.documentElement.setAttribute(
                "data-sidebar-size",
                "sm-hover"
            );
        } else {
            document.documentElement.setAttribute(
                "data-sidebar-size",
                "sm-hover"
            );
        }
    };

    return (
        <React.Fragment>
            <style>
                {`
                    /* ─── Vyaris sidebar — light, hairline, lime accent ─── */
                    .minimal-sidebar {
                        background: #FFFFFF;
                        border-right: 1px solid var(--vy-line-1, #D2D6CB);
                    }
                    .minimal-logo-box {
                        background: #FFFFFF;
                        border-bottom: 1px solid var(--vy-line-1, #D2D6CB);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 12px 20px;
                        height: 90px;
                        position: relative;
                    }
                    .minimal-logo-box .logo img {
                        height: 55px;
                        width: auto;
                        display: block;
                    }
                    .minimal-logo-box .btn-vertical-sm-hover {
                        position: absolute;
                        right: 16px;
                        top: 50%;
                        transform: translateY(-50%);
                    }

                    .menu-title {
                        color: var(--vy-fg-3, #8E918A) !important;
                        font-family: var(--vy-font-display, 'Barlow', sans-serif);
                        font-size: 11px !important;
                        font-weight: 600;
                        letter-spacing: 0.18em;
                        text-transform: uppercase;
                        padding: 18px 20px 8px;
                        margin-top: 4px;
                        position: relative;
                    }
                    .menu-title::before {
                        content: "";
                        display: inline-block;
                        width: 6px; height: 6px;
                        background: var(--vy-lime, #1a7a3e);
                        margin-right: 10px;
                        transform: translateY(-1px);
                    }

                    .navbar-nav .nav-item {
                        margin: 1px 12px;
                    }
                    .navbar-nav .nav-link {
                        color: var(--vy-fg-2, #5C5F58) !important;
                        font-family: var(--vy-font-body, 'Manrope', sans-serif);
                        font-size: 13px;
                        font-weight: 500;
                        padding: 8px 12px !important;
                        border-radius: 6px;
                        transition: background 120ms ease, color 120ms ease;
                        border-left: 2px solid transparent;
                    }
                    .navbar-nav .nav-link:hover {
                        background: var(--vy-bg-2, #EDEFE8);
                        color: var(--vy-ink, #0A0B0A) !important;
                    }
                    .navbar-nav .nav-link.active {
                        background: var(--vy-bg-2, #EDEFE8);
                        color: var(--vy-ink, #0A0B0A) !important;
                        font-weight: 600;
                        border-left: 2px solid var(--vy-lime, #1a7a3e);
                        border-radius: 0 6px 6px 0;
                        padding-left: 10px !important;
                    }
                    .navbar-nav .menu-link {
                        display: flex;
                        align-items: center;
                    }

                    .menu-dropdown { margin: 2px 0; padding: 2px 0; }
                    .menu-dropdown .nav-link {
                        padding-left: 38px !important;
                        font-size: 12.5px;
                        font-weight: 400;
                    }

                    .navbar-nav i { margin-right: 10px; }

                    .btn-vertical-sm-hover {
                        background: transparent !important;
                        border: 1px solid var(--vy-line-1, #D2D6CB) !important;
                        border-radius: 6px !important;
                        padding: 4px 8px !important;
                        color: var(--vy-fg-2, #5C5F58) !important;
                        transition: border-color 120ms ease, color 120ms ease;
                    }
                    .btn-vertical-sm-hover:hover {
                        border-color: var(--vy-lime, #1a7a3e) !important;
                        color: var(--vy-ink, #0A0B0A) !important;
                    }

                    .navbar-nav .menu-link[data-bs-toggle="collapse"]:after {
                        content: "\\203A";
                        position: absolute;
                        right: 15px;
                        font-size: 22px !important;
                        font-weight: 600;
                        transition: transform 200ms ease;
                        color: var(--vy-fg-3, #8E918A) !important;
                    }
                    .navbar-nav .menu-link[data-bs-toggle="collapse"][aria-expanded="true"]:after {
                        transform: rotate(90deg);
                        color: var(--vy-ink, #0A0B0A) !important;
                    }

                    .simplebar-track.simplebar-vertical {
                        width: 4px;
                        background: transparent;
                    }
                    .simplebar-scrollbar::before {
                        background: var(--vy-line-2, #B9BEB1);
                        border-radius: 4px;
                    }

                    /* ─── Collapsed sidebar (sm / sm-hover) ─── */
                    [data-sidebar-size="sm"] .navbar-menu,
                    [data-sidebar-size="sm-hover"] .navbar-menu {
                        width: 70px !important;
                        overflow: visible !important;
                    }
                    [data-sidebar-size="sm"] .main-content,
                    [data-sidebar-size="sm-hover"] .main-content {
                        margin-left: 70px !important;
                    }
                    [data-sidebar-size="sm"] .logo-lg,
                    [data-sidebar-size="sm-hover"] .logo-lg {
                        display: none !important;
                    }
                    [data-sidebar-size="sm"] .logo-sm,
                    [data-sidebar-size="sm-hover"] .logo-sm {
                        display: inline-block !important;
                    }
                    [data-sidebar-size="sm"] .navbar-brand-box,
                    [data-sidebar-size="sm-hover"] .navbar-brand-box {
                        padding: 15px 5px !important;
                        justify-content: center;
                    }

                    .collapsed-menu-wrapper {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        padding: 8px 0;
                        gap: 2px;
                    }
                    .collapsed-nav-item {
                        position: relative;
                        width: 100%;
                        display: flex;
                        justify-content: center;
                    }
                    .collapsed-icon-link {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 42px;
                        height: 42px;
                        border-radius: 8px;
                        color: var(--vy-fg-2, #5C5F58);
                        font-size: 20px;
                        transition: background 120ms ease, color 120ms ease, box-shadow 120ms ease;
                        cursor: pointer;
                        text-decoration: none;
                    }
                    .collapsed-icon-link:hover {
                        background: var(--vy-bg-2, #EDEFE8);
                        color: var(--vy-ink, #0A0B0A);
                        text-decoration: none;
                    }
                    .collapsed-icon-link.active {
                        background: var(--vy-bg-2, #EDEFE8);
                        color: var(--vy-ink, #0A0B0A);
                        box-shadow: inset 2px 0 0 var(--vy-lime, #1a7a3e);
                    }
                    .collapsed-icon-link i { margin: 0 !important; line-height: 1; }

                    /* ─── Flyouts (collapsed mode) — Vyaris ink panel ─── */
                    .flyout-tooltip {
                        position: absolute;
                        left: 70px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: var(--vy-ink, #0A0B0A);
                        color: #F4F5F2;
                        padding: 6px 14px;
                        border-radius: 6px;
                        font-family: var(--vy-font-body, 'Manrope', sans-serif);
                        font-size: 13px;
                        font-weight: 500;
                        white-space: nowrap;
                        z-index: 1060;
                        box-shadow: 0 0 0 1px var(--vy-lime, #1a7a3e), 0 8px 24px rgba(10,11,10,0.18);
                        pointer-events: none;
                    }
                    .flyout-tooltip::before {
                        content: '';
                        position: absolute;
                        left: -6px;
                        top: 50%;
                        transform: translateY(-50%);
                        border: 6px solid transparent;
                        border-right-color: var(--vy-ink, #0A0B0A);
                        border-left: none;
                    }

                    .flyout-panel {
                        position: absolute;
                        left: 64px;
                        top: 0;
                        min-width: 220px;
                        max-width: 280px;
                        background: #FFFFFF;
                        border-radius: 8px;
                        border: 1px solid var(--vy-line-1, #D2D6CB);
                        box-shadow: 0 8px 24px rgba(10, 11, 10, 0.08);
                        z-index: 1060;
                        overflow: hidden;
                        animation: flyoutIn 0.12s ease-out;
                    }
                    @keyframes flyoutIn {
                        from { opacity: 0; transform: translateX(-4px); }
                        to   { opacity: 1; transform: translateX(0); }
                    }
                    .flyout-panel::before {
                        content: '';
                        position: absolute;
                        left: -16px;
                        top: 0;
                        width: 20px;
                        height: 100%;
                        background: transparent;
                    }

                    .flyout-header {
                        padding: 12px 16px 8px;
                        font-family: var(--vy-font-display, 'Barlow', sans-serif);
                        font-size: 11px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.18em;
                        color: var(--vy-fg-3, #8E918A);
                        border-bottom: 1px solid var(--vy-line-0, #E2E5DC);
                    }
                    .flyout-list { list-style: none; margin: 0; padding: 6px 0; }

                    .flyout-section-header {
                        padding: 12px 16px 4px;
                        font-family: var(--vy-font-display, 'Barlow', sans-serif);
                        font-size: 10px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.18em;
                        color: var(--vy-fg-3, #8E918A);
                        list-style: none;
                        margin-top: 4px;
                        border-top: 1px solid var(--vy-line-0, #E2E5DC);
                    }
                    .flyout-section-header:first-child {
                        border-top: none;
                        margin-top: 0;
                    }

                    .flyout-item { list-style: none; }
                    .flyout-link {
                        display: block;
                        padding: 8px 16px;
                        font-family: var(--vy-font-body, 'Manrope', sans-serif);
                        font-size: 13px;
                        color: var(--vy-fg-1, #2B2D28);
                        text-decoration: none;
                        transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
                        border-left: 2px solid transparent;
                    }
                    .flyout-link:hover {
                        background: var(--vy-bg-2, #EDEFE8);
                        color: var(--vy-ink, #0A0B0A);
                        text-decoration: none;
                        border-left-color: var(--vy-lime, #1a7a3e);
                    }
                    .flyout-link.active {
                        background: var(--vy-bg-2, #EDEFE8);
                        color: var(--vy-ink, #0A0B0A);
                        font-weight: 600;
                        border-left-color: var(--vy-lime, #1a7a3e);
                    }
                `}
            </style>
            <div className="app-menu navbar-menu minimal-sidebar">
                <div className="navbar-brand-box minimal-logo-box">
                    <Link to="/dashboard" className="logo logo-dark">
                        <span className="logo-sm">
                            <img src={npLogo} alt="Nagar Palika" height="28" />
                        </span>
                        <span className="logo-lg">
                            <img src={npLogo} alt="Nagar Palika" height="24" />
                        </span>
                    </Link>

                    <Link to="/dashboard" className="logo logo-light">
                        <span className="logo-sm">
                            <img src={npLogo} alt="Nagar Palika" height="28" />
                        </span>
                        <span className="logo-lg">
                            <img src={npLogo} alt="Nagar Palika" height="24" />
                        </span>
                    </Link>
                    <button
                        onClick={addEventListenerOnSmHoverMenu}
                        type="button"
                        className="btn btn-sm p-0 fs-20 header-item float-end btn-vertical-sm-hover"
                        id="vertical-hover"
                    >
                        <i className="ri-record-circle-line"></i>
                    </button>
                </div>
                {layoutType === "horizontal" ? (
                    <div id="scrollbar">
                        <Container fluid>
                            <div id="two-column-menu"></div>
                            <ul className="navbar-nav" id="navbar-nav">
                                <HorizontalLayout />
                            </ul>
                        </Container>
                    </div>
                ) : layoutType === "twocolumn" ? (
                    <React.Fragment>
                        <TwoColumnLayout
                            layoutType={layoutType}
                            logo={adminData?.data.Logo}
                        />
                        <div className="sidebar-background"></div>
                    </React.Fragment>
                ) : (
                    <React.Fragment>
                        <SimpleBar id="scrollbar" className="h-100">
                            <Container fluid>
                                <div id="two-column-menu"></div>
                                <ul className="navbar-nav" id="navbar-nav">
                                    <VerticalLayout layoutType={layoutType} />
                                </ul>
                            </Container>
                        </SimpleBar>
                        <div className="sidebar-background"></div>
                    </React.Fragment>
                )}
            </div>
            <div className="vertical-overlay"></div>
        </React.Fragment>
    );
};

export default Sidebar;
