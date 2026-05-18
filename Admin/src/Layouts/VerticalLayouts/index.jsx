import React, { useEffect, useState, useContext, useCallback } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Collapse } from "reactstrap";
import withRouter from "../../Components/Common/withRouter";
import { MenuContext } from "../../context/MenuContext";

const VerticalLayout = (props) => {
    const { menuData, loading, updateCurrentPagePermissions } =
        useContext(MenuContext);
    const [expandedItems, setExpandedItems] = useState({});
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [hoveredGroup, setHoveredGroup] = useState(null);

    const path = props.router.location.pathname;

    // Watch for sidebar size changes
    useEffect(() => {
        const checkCollapsed = () => {
            const size = document.documentElement.getAttribute("data-sidebar-size");
            setIsCollapsed(size === "sm" || size === "sm-hover");
        };

        checkCollapsed();

        // Use MutationObserver to detect attribute changes on <html>
        const observer = new MutationObserver(checkCollapsed);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-sidebar-size"],
        });

        return () => observer.disconnect();
    }, []);

    // Find parent menu/group IDs for a given URL path
    const findParentIds = useCallback((menuItems, targetPath, parentIds = []) => {
        for (const item of menuItems) {
            if (item.url === targetPath) {
                return parentIds;
            }
            if (item.children && item.children.length > 0) {
                const found = findParentIds(item.children, targetPath, [...parentIds, item.id]);
                if (found) return found;
            }
            if (item.menus && item.menus.length > 0) {
                const found = findParentIds(item.menus, targetPath, [...parentIds, item.groupId]);
                if (found) return found;
            }
        }
        return null;
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });

        // Find and expand parent menus for the current path
        if (menuData && menuData.length > 0) {
            const parentIds = findParentIds(menuData, path);
            if (parentIds && parentIds.length > 0) {
                setExpandedItems((prev) => {
                    const newState = { ...prev };
                    parentIds.forEach((id) => {
                        newState[id] = true;
                    });
                    return newState;
                });
            }
        }

        const initMenu = () => {
            const pathName = path;
            const ul = document.getElementById("navbar-nav");
            const items = ul.getElementsByTagName("a");
            let itemsArray = [...items];
            removeActivation(itemsArray);
            let matchingMenuItem = itemsArray.find((x) => {
                return x.pathname === pathName;
            });
            if (matchingMenuItem) {
                activateParentDropdown(matchingMenuItem);
            }
        };
        if (props.layoutType === "vertical") {
            initMenu();
        }
    }, [path, props.layoutType, menuData, findParentIds]);

    // Toggle expanded state (accordion behavior)
    const toggleItem = (itemId, siblingIds = []) => {
        setExpandedItems((prev) => {
            const isCurrentlyOpen = prev[itemId];
            if (!isCurrentlyOpen) {
                const newState = { ...prev };
                siblingIds.forEach((id) => {
                    if (id !== itemId) {
                        newState[id] = false;
                    }
                });
                newState[itemId] = true;
                return newState;
            } else {
                return { ...prev, [itemId]: false };
            }
        });
    };

    function activateParentDropdown(item) {
        item.classList.add("active");
        let parentCollapseDiv = item.closest(".collapse.menu-dropdown");

        if (parentCollapseDiv) {
            parentCollapseDiv.classList.add("show");
            parentCollapseDiv.parentElement.children[0].classList.add("active");
            parentCollapseDiv.parentElement.children[0].setAttribute(
                "aria-expanded",
                "true"
            );
            if (
                parentCollapseDiv.parentElement.closest(
                    ".collapse.menu-dropdown"
                )
            ) {
                parentCollapseDiv.parentElement
                    .closest(".collapse")
                    .classList.add("show");
                if (
                    parentCollapseDiv.parentElement.closest(".collapse")
                        .previousElementSibling
                )
                    parentCollapseDiv.parentElement
                        .closest(".collapse")
                        .previousElementSibling.classList.add("active");
                if (
                    parentCollapseDiv.parentElement
                        .closest(".collapse")
                        .previousElementSibling.closest(".collapse")
                ) {
                    parentCollapseDiv.parentElement
                        .closest(".collapse")
                        .previousElementSibling.closest(".collapse")
                        .classList.add("show");
                    parentCollapseDiv.parentElement
                        .closest(".collapse")
                        .previousElementSibling.closest(".collapse")
                        .previousElementSibling.classList.add("active");
                }
            }
            return false;
        }
        return false;
    }

    const removeActivation = (items) => {
        let actiItems = items.filter((x) => x.classList.contains("active"));
        actiItems.forEach((item) => {
            if (item.classList.contains("menu-link")) {
                if (!item.classList.contains("active")) {
                    item.setAttribute("aria-expanded", false);
                }
                if (item.nextElementSibling) {
                    item.nextElementSibling.classList.remove("show");
                }
            }
            if (item.classList.contains("nav-link")) {
                if (item.nextElementSibling) {
                    item.nextElementSibling.classList.remove("show");
                }
                item.setAttribute("aria-expanded", false);
            }
            item.classList.remove("active");
        });
    };

    const handleMenuItemClick = (menuId) => {
        if (menuId) {
            updateCurrentPagePermissions(menuId);
        }
    };

    // ─── COLLAPSED MODE: Flyout rendering ───

    // Recursively render all items in the flyout panel (flat/indented)
    const renderFlyoutItems = (items, depth = 0) => {
        return items.map((item) => {
            if (item.isParent && item.children && item.children.length > 0) {
                // Render as a section header + its children
                return (
                    <React.Fragment key={item.id}>
                        <li className="flyout-section-header" style={{ paddingLeft: `${16 + depth * 12}px` }}>
                            {item.name}
                        </li>
                        {renderFlyoutItems(item.children, depth + 1)}
                    </React.Fragment>
                );
            }
            return (
                <li key={item.id} className="flyout-item">
                    <Link
                        to={item.url}
                        className={`flyout-link${path === item.url ? " active" : ""}`}
                        style={{ paddingLeft: `${16 + depth * 12}px` }}
                        onClick={() => handleMenuItemClick(item.id)}
                    >
                        {item.name}
                    </Link>
                </li>
            );
        });
    };

    const renderCollapsedGroup = (group) => {
        // Direct link groups — just an icon with tooltip-style hover
        if (group.isLink) {
            return (
                <li
                    className="collapsed-nav-item"
                    key={group.groupId}
                    onMouseEnter={() => setHoveredGroup(group.groupId)}
                    onMouseLeave={() => setHoveredGroup(null)}
                >
                    <Link
                        className={`collapsed-icon-link${path === group.url ? " active" : ""}`}
                        to={group.url}
                        onClick={() => handleMenuItemClick(group.groupId)}
                    >
                        {group.icon ? <i className={group.icon}></i> : null}
                    </Link>
                    {/* Tooltip label on hover */}
                    {hoveredGroup === group.groupId && (
                        <div className="flyout-tooltip">
                            {group.groupName}
                        </div>
                    )}
                </li>
            );
        }

        // Groups with menus — icon + flyout panel on hover
        if (!group || !group.groupName || !group.menus) return null;

        return (
            <li
                className="collapsed-nav-item"
                key={group.groupId}
                onMouseEnter={() => setHoveredGroup(group.groupId)}
                onMouseLeave={() => setHoveredGroup(null)}
            >
                <Link
                    className={`collapsed-icon-link${expandedItems[group.groupId] ? " active" : ""}`}
                    to="#"
                    onClick={(e) => e.preventDefault()}
                >
                    {group.icon ? <i className={group.icon}></i> : null}
                </Link>
                {/* Flyout panel */}
                {hoveredGroup === group.groupId && (
                    <div className="flyout-panel">
                        <div className="flyout-header">{group.groupName}</div>
                        <ul className="flyout-list">
                            {renderFlyoutItems(group.menus)}
                        </ul>
                    </div>
                )}
            </li>
        );
    };

    // ─── EXPANDED MODE: Normal rendering ───

    const renderMenuItem = (item, siblingIds = []) => {
        if (!item || !item.name) return null;

        if (item.isParent && item.children && item.children.length > 0) {
            const childSiblingIds = item.children
                .filter((child) => child.isParent && child.children && child.children.length > 0)
                .map((child) => child.id);

            return (
                <li className="nav-item" key={item.id}>
                    <Link
                        className="nav-link menu-link"
                        to="#"
                        data-bs-toggle="collapse"
                        onClick={() => toggleItem(item.id, siblingIds)}
                        aria-expanded={expandedItems[item.id] ? "true" : "false"}
                    >
                        {item.icon ? <i className={item.icon}></i> : null}
                        <span data-key="t-apps">{item.name}</span>
                    </Link>
                    <Collapse
                        className="menu-dropdown"
                        isOpen={expandedItems[item.id]}
                        data-group-name={item.name}
                    >
                        <ul className="nav nav-sm flex-column">
                            {item.children.map((child) =>
                                renderMenuItem(child, childSiblingIds)
                            )}
                        </ul>
                    </Collapse>
                </li>
            );
        } else {
            return (
                <li className="nav-item" key={item.id}>
                    <Link
                        className="nav-link"
                        to={item.url}
                        onClick={() => handleMenuItemClick(item.id)}
                    >
                        {item.icon ? <i className={item.icon}></i> : null}
                        <span data-key="t-apps">{item.name}</span>
                    </Link>
                </li>
            );
        }
    };

    const renderMenuGroup = (group, siblingGroupIds = []) => {
        if (group.isLink) {
            if (!group || !group.groupName || !group.url) return null;
            return (
                <li className="nav-item" key={group.groupId}>
                    <Link
                        className="nav-link menu-link"
                        to={group.url}
                        onClick={() => handleMenuItemClick(group.groupId)}
                    >
                        {group.icon ? <i className={group.icon}></i> : null}
                        <span data-key="t-apps">{group.groupName}</span>
                    </Link>
                </li>
            );
        }

        if (!group || !group.groupName || !group.menus) return null;

        const menuSiblingIds = group.menus
            .filter((menu) => menu.isParent && menu.children && menu.children.length > 0)
            .map((menu) => menu.id);

        return (
            <li className="nav-item" key={group.groupId}>
                <Link
                    className="nav-link menu-link"
                    to="#"
                    data-bs-toggle="collapse"
                    onClick={() => toggleItem(group.groupId, siblingGroupIds)}
                    aria-expanded={expandedItems[group.groupId] ? "true" : "false"}
                >
                    {group.icon ? <i className={group.icon}></i> : null}
                    <span data-key="t-apps">{group.groupName}</span>
                </Link>
                <Collapse
                    className="menu-dropdown"
                    isOpen={expandedItems[group.groupId]}
                    data-group-name={group.groupName}
                >
                    <ul className="nav nav-sm flex-column">
                        {group.menus &&
                            group.menus.map((menu) =>
                                renderMenuItem(menu, menuSiblingIds)
                            )}
                    </ul>
                </Collapse>
            </li>
        );
    };

    // ─── RENDER ───

    if (isCollapsed) {
        return (
            <React.Fragment>
                <div className="collapsed-menu-wrapper">
                    {loading ? (
                        <div className="collapsed-nav-item">
                            <span className="collapsed-icon-link">
                                <i className="ri-loader-4-line"></i>
                            </span>
                        </div>
                    ) : (
                        Array.isArray(menuData) && menuData.length > 0
                            ? menuData.map((group) => renderCollapsedGroup(group))
                            : null
                    )}
                </div>
            </React.Fragment>
        );
    }

    return (
        <React.Fragment>
            <div className="mb-5">
                <li className="menu-title">
                    <span
                        data-key="t-menu"
                        style={{ fontSize: "14px", padding: "0px" }}
                    >
                        Menu
                    </span>
                </li>

                {loading ? (
                    <li className="nav-item">
                        <span className="nav-link">Loading menus...</span>
                    </li>
                ) : (
                    <>
                        {Array.isArray(menuData) && menuData.length > 0 ? (
                            (() => {
                                const siblingGroupIds = menuData
                                    .filter(
                                        (g) =>
                                            !g.isLink &&
                                            g.menus &&
                                            g.menus.length > 0
                                    )
                                    .map((g) => g.groupId);
                                return menuData.map((group) =>
                                    renderMenuGroup(group, siblingGroupIds)
                                );
                            })()
                        ) : (
                            <li className="nav-item">
                                <span className="nav-link">
                                    No menu items available.
                                </span>
                            </li>
                        )}
                    </>
                )}
            </div>
        </React.Fragment>
    );
};

VerticalLayout.propTypes = {
    location: PropTypes.object,
};

export default withRouter(VerticalLayout);
