import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import withRouter from "../Components/Common/withRouter";

import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

const Layout = (props) => {
    const [headerClass, setHeaderClass] = useState("");

    useEffect(() => {
        document.documentElement.setAttribute("data-layout", "vertical");
        document.documentElement.setAttribute("data-layout-mode", "light");
        window.addEventListener("scroll", scrollNavigation, true);
        return () => window.removeEventListener("scroll", scrollNavigation, true);
    }, []);

    function scrollNavigation() {
        const scrollup = document.documentElement.scrollTop;
        setHeaderClass(scrollup > 50 ? "topbar-shadow" : "");
    }

    return (
        <div id="layout-wrapper">
            <Header headerClass={headerClass} />
            <Sidebar layoutType="vertical" />
            <div className="main-content">
                {props.children}
                <Footer />
            </div>
        </div>
    );
};

Layout.propTypes = {
    children: PropTypes.any,
};

export default withRouter(Layout);
