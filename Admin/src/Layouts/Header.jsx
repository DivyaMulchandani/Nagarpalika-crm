import React from "react";
import ProfileDropdown from "../Components/Common/ProfileDropdown";
import UniversalSearch from "../Components/Common/UniversalSearch";

const Header = ({ headerClass }) => {
    const toogleMenuBtn = () => {
        var windowSize = document.documentElement.clientWidth;

        if (windowSize > 767)
            document.querySelector(".hamburger-icon").classList.toggle("open");

        //For collapse horizontal menu
        if (
            document.documentElement.getAttribute("data-layout") ===
            "horizontal"
        ) {
            document.body.classList.contains("menu")
                ? document.body.classList.remove("menu")
                : document.body.classList.add("menu");
        }

        //For collapse vertical menu
        if (
            document.documentElement.getAttribute("data-layout") === "vertical"
        ) {
            if (windowSize < 1025 && windowSize > 767) {
                document.body.classList.remove("vertical-sidebar-enable");
                document.documentElement.getAttribute("data-sidebar-size") ===
                    "sm"
                    ? document.documentElement.setAttribute(
                        "data-sidebar-size",
                        ""
                    )
                    : document.documentElement.setAttribute(
                        "data-sidebar-size",
                        "sm"
                    );
            } else if (windowSize > 1025) {
                document.body.classList.remove("vertical-sidebar-enable");
                const currentSize =
                    document.documentElement.getAttribute("data-sidebar-size");

                if (currentSize === "lg" || currentSize === null || currentSize === "") {
                    document.documentElement.setAttribute(
                        "data-sidebar-size",
                        "sm"
                    );
                } else {
                    document.documentElement.setAttribute(
                        "data-sidebar-size",
                        "lg"
                    );
                }
            } else if (windowSize <= 767) {
                document.body.classList.add("vertical-sidebar-enable");
                document.documentElement.setAttribute(
                    "data-sidebar-size",
                    "lg"
                );
            }
        }

        //Two column menu
        if (
            document.documentElement.getAttribute("data-layout") === "twocolumn"
        ) {
            document.body.classList.contains("twocolumn-panel")
                ? document.body.classList.remove("twocolumn-panel")
                : document.body.classList.add("twocolumn-panel");
        }
    };
    return (
        <>
            <style>{`
                #page-topbar.vy-topbar {
                    background: #FFFFFF;
                    border-bottom: 1px solid var(--vy-line-1, #D2D6CB);
                    box-shadow: none;
                }
                #page-topbar.vy-topbar.topbar-shadow {
                    box-shadow: 0 1px 0 var(--vy-line-1, #D2D6CB);
                }
                .vy-topbar .vertical-menu-btn {
                    color: var(--vy-fg-1, #2B2D28) !important;
                    background: transparent !important;
                    border: 0 !important;
                }
                .vy-topbar .vertical-menu-btn:hover {
                    color: var(--vy-ink, #0A0B0A) !important;
                }
                .vy-topbar .vertical-menu-btn .hamburger-icon span {
                    background: var(--vy-fg-1, #2B2D28);
                }
            `}</style>
            <header id="page-topbar" className={`vy-topbar ${headerClass || ""}`}>
                <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex">
                        <button
                            onClick={toogleMenuBtn}
                            type="button"
                            className="btn btn-sm px-3 fs-16 header-item vertical-menu-btn topnav-hamburger"
                            id="topnav-hamburger-icon"
                        >
                            <span className="hamburger-icon">
                                <span></span>
                                <span></span>
                                <span></span>
                            </span>
                        </button>
                    </div>

                    <UniversalSearch />
                    <div className="d-flex align-items-center">
                        <ProfileDropdown />
                    </div>
                </div>
            </header>
        </>
    );
};

export default Header;
