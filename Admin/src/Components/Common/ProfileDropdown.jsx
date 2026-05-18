import React, { useState, useContext } from "react";
import {
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
} from "reactstrap";

import vyarisMark from "../../assets/images/vyaris-mark.svg";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { logout } from "../../api/auth.api";
import { ROLES } from "../../constants/roles";

const ProfileDropdown = () => {
    const navigate = useNavigate();
    const { adminData, setAdminData, role } = useContext(AuthContext);

    const handleLogout = async () => {
        setAdminData(null);
        await logout(); // This will call the server and clear localStorage
        // Note: logout() already redirects to "/", so no need to navigate here
    };

    //Dropdown Toggle
    const [isProfileDropdown, setIsProfileDropdown] = useState(false);
    const toggleProfileDropdown = () => {
        setIsProfileDropdown(!isProfileDropdown);
    };
    return (
        <React.Fragment>
            <Dropdown
                isOpen={isProfileDropdown}
                toggle={toggleProfileDropdown}
                className="ms-sm-3 header-item topbar-user"
            // style={{height: "50px"}}
            >
                <DropdownToggle tag="button" type="button" className="btn">
                    <span className="d-flex align-items-center">
                        <img
                            className="rounded-circle header-profile-user"
                            src={vyarisMark}
                            alt="Header Avatar"
                            style={{ background: "var(--vy-bg-2, #EDEFE8)", padding: 4 }}
                        />
                        <span className="text-start ms-xl-2">
                            <span className="d-none d-xl-inline-block ms-1 fw-medium user-name-text">
                                {/* {userName} */}
                                {/* {adminData?.companyName} */}
                                {role}
                            </span>
                            {/* <span className="d-none d-xl-block ms-1 fs-12 text-muted user-name-sub-text">Founder</span> */}
                        </span>
                    </span>
                </DropdownToggle>
                <DropdownMenu className="dropdown-menu-end">
                    <h6 className="dropdown-header">
                        Welcome {adminData?.companyName || adminData?.employeeName}!
                    </h6>
                    <DropdownItem
                        href={role === ROLES.ADMIN ? "/company-details" : "/employee-profile"}
                        as="Link"
                    >
                        <i className="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i>
                        <span className="align-middle">Profile</span>
                    </DropdownItem>

                    <DropdownItem onClick={handleLogout}>
                        <i className="mdi mdi-logout text-muted fs-16 align-middle me-1"></i>{" "}
                        <span className="align-middle" data-key="t-logout">
                            Logout
                        </span>
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>
        </React.Fragment>
    );
};

export default ProfileDropdown;
