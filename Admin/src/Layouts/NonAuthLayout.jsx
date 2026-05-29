import React, { useEffect } from "react";
import withRouter from "../Components/Common/withRouter";

const NonAuthLayout = ({ children }) => {
    useEffect(() => {
        // Set default to light mode for auth pages
        document.body.setAttribute("data-layout-mode", "light");
        return () => {
            document.body.removeAttribute("data-layout-mode");
        };
    }, []);

    return <div>{children}</div>;
};

export default withRouter(NonAuthLayout);
