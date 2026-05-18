import { createContext, useEffect, useState, useContext } from "react";
import { useLocation } from "react-router-dom";
import { getCurrentUser } from "../api/auth.api";
import { getMenusByGroups } from "../api/menus.api";
import { getEmployeeRolesByRoleId } from "../api/employeeRoles.api";
import { AuthContext } from "./AuthContext";
import { ROLES } from "../constants/roles";

const MenuContext = createContext();

// Cache duration in milliseconds (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000;

const MenuProvider = ({ children }) => {
    const [menuData, setMenuData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [employeeId, setEmployeeId] = useState(null);
    const [employeeRoleId, setEmployeeRoleId] = useState(null);
    const [isStatusFetched, setIsStatusFetched] = useState(false);
    const [employeeRoles, setEmployeeRoles] = useState(null);
    const [currentPagePermissions, setCurrentPagePermissions] = useState({
        menuId: null,
        read: false,
        write: false,
        delete: false,
        edit: false,
        print: false,
        mail: false
    });

    // Local cache to store menu data
    // Using useRef pattern with useState to persist between renders
    const [menuCache, setMenuCache] = useState({
        adminMenus: null,
        roleMenus: {},
        timestamp: null
    });

    // Get auth state from AuthContext
    const { role: authRole, isSessionVerified } = useContext(AuthContext);
    const location = useLocation();

    // Check if the current user is an admin
    const checkUserRole = async () => {
        setIsStatusFetched(false);
        try {
            // Use authRole from AuthContext
            if (!authRole) {
                return false;
            }

            const response = await getCurrentUser();

            if (response.data.isOk) {
                const userData = response.data.data;
                console.log("User data:", userData);
                setIsStatusFetched(true);
                // Set admin status, employee ID and role ID
                setIsAdmin(userData.role === ROLES.ADMIN);
                setEmployeeId(userData._id);
                setEmployeeRoleId(userData.roleId);
                return userData.role === ROLES.ADMIN;
            }

            return false;
        } catch (error) {
            console.error("Error checking user role:", error);
            return false;
        }
    };

    // Fetch employee roles based on roleId instead of employee ID
    const fetchEmployeeRoles = async (roleId) => {
        try {
            if (!roleId) return null;

            const response = await getEmployeeRolesByRoleId(roleId);

            if (response.data.isOk) {
                setEmployeeRoles(response.data.data[0]);
                return response.data.data[0];
            }

            return null;
        } catch (error) {
            console.error("Error fetching employee roles:", error);
            return null;
        }
    };

    // Helper to check if cache is valid
    const isCacheValid = () => {
        if (!menuCache.timestamp) return false;

        const now = Date.now();
        return (now - menuCache.timestamp) < CACHE_DURATION;
    };

    // Invalidate the menu cache (call this when roles are updated)
    const invalidateMenuCache = () => {
        setMenuCache({
            adminMenus: null,
            roleMenus: {},
            timestamp: null
        });
    };

    const fetchMenus = async (forceRefresh = false) => {
        try {
            // Use authRole from AuthContext
            if (!authRole) {
                setError("No authentication found");
                setLoading(false);
                return;
            }

            setLoading(true);

            // First check if user is admin
            const adminStatus = await checkUserRole();

            console.log("Admin status:", adminStatus);

            // Check if we have valid cached data
            if (!forceRefresh && isCacheValid()) {
                if (adminStatus && menuCache.adminMenus) {
                    console.log("Using cached admin menus");
                    setMenuData(menuCache.adminMenus);
                    setLoading(false);
                    return;
                } else if (!adminStatus && employeeRoleId && menuCache.roleMenus[employeeRoleId]) {
                    console.log(`Using cached menus for role ${employeeRoleId}`);
                    setMenuData(menuCache.roleMenus[employeeRoleId]);
                    setLoading(false);
                    return;
                }
            }

            // Get all menus
            const response = await getMenusByGroups();

            if (response.data.isOk) {
                let menuGroups = response.data.data;

                const now = Date.now();

                // If admin, store all menus
                if (adminStatus) {
                    console.log("Admin menus", menuGroups);
                    setMenuData(menuGroups);
                    setMenuCache(prev => ({
                        ...prev,
                        adminMenus: menuGroups,
                        timestamp: now
                    }));
                }
                // If not admin, filter menus based on employee roles
                else if (employeeRoleId) {
                    const roles = await fetchEmployeeRoles(employeeRoleId);

                    if (roles && roles.roles) {
                        // Filter menu groups and their menus based on permissions
                        menuGroups = filterMenusByPermission(menuGroups, roles.roles);

                        // Cache the filtered menus for this role
                        setMenuData(menuGroups);
                        setMenuCache(prev => ({
                            ...prev,
                            roleMenus: {
                                ...prev.roleMenus,
                                [employeeRoleId]: menuGroups
                            },
                            timestamp: now
                        }));
                    }
                }

                // Update permissions for current page based on URL
                updatePermissionsByCurrentUrl();
            } else {
                setError(response?.data?.message || "Failed to get menu data");
            }
        } catch (error) {
            console.error("Error fetching menus:", error);
            setError(error.message || "Failed to fetch menus");
        } finally {
            setLoading(false);
        }
    };

    // Helper function to filter menus based on user permissions
    const filterMenusByPermission = (menuGroups, roles) => {
        if (!Array.isArray(menuGroups) || !Array.isArray(roles)) {
            return [];
        }

        // Filter menu groups
        const filteredGroups = menuGroups.filter(group => {
            // Check if this is a direct link group
            if (group.isLink) {
                // Keep this group only if the user has read permission for it
                return roles.some(role =>
                    role.menuGroupId === group.groupId && role.read
                );
            }

            // For groups with menus, filter their child menus
            const filteredMenus = filterMenuItems(group.menus || [], roles);

            // If group has any visible menus, keep it
            if (filteredMenus.length > 0) {
                group.menus = filteredMenus;
                return true;
            }

            return false;
        });

        return filteredGroups;
    };

    // Recursive helper function to filter menu items at any nesting level
    const filterMenuItems = (menuItems, roles) => {
        if (!Array.isArray(menuItems) || !Array.isArray(roles)) {
            return [];
        }

        return menuItems.filter(menu => {
            // Check if user has read permission for this menu
            const hasReadPermission = roles.some(role =>
                role.menuId === menu.id && role.read
            );

            // If this item has children, recursively filter them
            if (menu.children && menu.children.length > 0) {
                menu.children = filterMenuItems(menu.children, roles);

                // If item has read permission or any visible children, keep it
                return hasReadPermission || menu.children.length > 0;
            }

            // For leaf nodes, only keep those with read permission
            return hasReadPermission;
        });
    };

    // Update the current page permissions based on menu ID
    const updateCurrentPagePermissions = (menuId) => {
        if (isAdmin) {
            // Admin has all permissions
            setCurrentPagePermissions({
                menuId,
                read: true,
                write: true,
                delete: true,
                edit: true,
                print: true,
                mail: true
            });
            return;
        }

        if (!employeeRoles || !employeeRoles.roles || !menuId) {
            // Reset permissions if no roles or menu ID
            setCurrentPagePermissions({
                menuId: null,
                read: false,
                write: false,
                delete: false,
                edit: false,
                print: false,
                mail: false
            });
            return;
        }

        // Find the permission for this menu ID
        const menuPermission = employeeRoles.roles.find(role => role.menuId === menuId);

        if (menuPermission) {
            setCurrentPagePermissions({
                menuId,
                read: menuPermission.read || false,
                write: menuPermission.write || false,
                delete: menuPermission.delete || false,
                edit: menuPermission.edit || false,
                print: menuPermission.print || false,
                mail: menuPermission.mail || false
            });
        } else {
            // No specific permissions found for this menu
            setCurrentPagePermissions({
                menuId,
                read: false,
                write: false,
                delete: false,
                edit: false,
                print: false,
                mail: false
            });
        }
    };

    // Find permissions for a specific menu ID
    const getPermissionsForMenu = (menuId) => {
        if (isAdmin) {
            // Admin has all permissions
            return {
                menuId,
                read: true,
                write: true,
                delete: true,
                edit: true,
                print: true,
                mail: true
            };
        }

        if (!employeeRoles || !employeeRoles.roles || !menuId) {
            return {
                menuId,
                read: false,
                write: false,
                delete: false,
                edit: false,
                print: false,
                mail: false
            };
        }

        const menuPermission = employeeRoles.roles.find(role => role.menuId === menuId);

        if (menuPermission) {
            return {
                menuId,
                read: menuPermission.read || false,
                write: menuPermission.write || false,
                delete: menuPermission.delete || false,
                edit: menuPermission.edit || false,
                print: menuPermission.print || false,
                mail: menuPermission.mail || false
            };
        }

        return {
            menuId,
            read: false,
            write: false,
            delete: false,
            edit: false,
            print: false,
            mail: false
        };
    };

    // Strip sub-route suffixes to find the base route for permission lookup
    const getBaseRoute = (url) => {
        let base = url;
        if (base.endsWith('/add')) {
            base = base.slice(0, -4);
        } else {
            // Strip /:id/edit (MongoDB ObjectId = 24 hex chars)
            const editMatch = base.match(/^(.*?)\/[a-f0-9]{24}\/edit$/i);
            if (editMatch) return editMatch[1];
            // Strip /:id
            const viewMatch = base.match(/^(.*?)\/[a-f0-9]{24}$/i);
            if (viewMatch) return viewMatch[1];
        }
        return base;
    };

    // Find menu ID by URL path
    const findMenuIdByUrl = (url) => {
        if (!url || !Array.isArray(menuData)) {
            return null;
        }

        // Remove trailing slash and query parameters
        const cleanUrl = getBaseRoute(url.split('?')[0].replace(/\/+$/, ''));

        // Find menu with matching URL in all menu groups
        let foundMenuId = null;

        // First check direct link menu groups
        const directLinkGroup = menuData.find(group =>
            group.isLink && group.url && (group.url === cleanUrl || cleanUrl.endsWith(group.url))
        );

        if (directLinkGroup) {
            return directLinkGroup.groupId;
        }

        // Function to recursively search through menus
        const searchMenus = (menus) => {
            if (!Array.isArray(menus) || foundMenuId) return;

            for (const menu of menus) {
                if (menu.url && (menu.url === cleanUrl || cleanUrl.endsWith(menu.url))) {
                    foundMenuId = menu.id;
                    return;
                }

                // Check children menus
                if (menu.children && menu.children.length > 0) {
                    searchMenus(menu.children);
                }
            }
        };

        // Search through all menu groups
        for (const group of menuData) {
            if (group.menus && group.menus.length > 0) {
                searchMenus(group.menus);
                if (foundMenuId) break;
            }
        }

        return foundMenuId;
    };

    // Update permissions based on current URL
    const updatePermissionsByCurrentUrl = (path) => {
        const currentPath = path || window.location.pathname;
        const menuId = findMenuIdByUrl(currentPath);
        if (menuId) {
            updateCurrentPagePermissions(menuId);
        }
    };

    // Check user role when session is verified
    useEffect(() => {
        if (isSessionVerified && authRole) {
            checkUserRole();
        }
    }, [isSessionVerified, authRole]);

    // Refetch menus when role ID changes
    useEffect(() => {
        if (isSessionVerified && authRole && isStatusFetched) {
            fetchMenus();
        }
    }, [employeeRoleId, isSessionVerified, authRole]);

    // Listen for URL changes to update permissions
    useEffect(() => {
        if (!loading && menuData.length > 0) {
            updatePermissionsByCurrentUrl(location.pathname);
        }
    }, [loading, menuData, location.pathname]);

    return (
        <MenuContext.Provider value={{
            menuData,
            loading,
            error,
            fetchMenus,
            isAdmin,
            employeeRoles,
            invalidateMenuCache,
            currentPagePermissions,
            updateCurrentPagePermissions,
            getPermissionsForMenu,
            findMenuIdByUrl,
            updatePermissionsByCurrentUrl
        }}>
            {children}
        </MenuContext.Provider>
    );
};

export { MenuContext, MenuProvider };