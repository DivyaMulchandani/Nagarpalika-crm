import React, { useState, useEffect, useContext, useRef } from "react";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import { MenuContext } from "../../context/MenuContext";
import vySelectStyles from "../../assets/styles/vySelectStyles";

const UniversalSearch = () => {
    const [searchOptions, setSearchOptions] = useState([]);
    const selectRef = useRef(null);
    const navigate = useNavigate();
    const { menuData } = useContext(MenuContext);

    // Flatten menu structure into searchable options
    useEffect(() => {
        if (!menuData || menuData.length === 0) return;

        const options = [];

        const flattenMenus = (
            items,
            groupName = "",
            parentPath = [],
            depth = 0
        ) => {
            console.log(
                `${"  ".repeat(
                    depth
                )}🔍 Processing level ${depth}, groupName: "${groupName}", parentPath: [${parentPath.join(
                    ", "
                )}]`
            );

            items.forEach((item, index) => {
                console.log(`${"  ".repeat(depth)}  Item ${index}:`, {
                    name: item.name || item.groupName,
                    hasGroupId: !!item.groupId,
                    hasMenus: !!(item.menus && item.menus.length),
                    hasChildren: !!(item.children && item.children.length),
                    hasUrl: !!item.url,
                    isLink: item.isLink,
                    url: item.url,
                });

                // Handle menu groups (check for groupId property, not menus.length)
                if (item.groupId || (item.menus && item.menus.length > 0)) {

                    // Check if this is a direct link group
                    if (item.isLink && item.url && item.url !== "#") {
                        options.push({
                            value: item.url,
                            label: item.groupName,
                            name: item.groupName,
                            group: "",
                        });
                    }
                    // Recursively flatten the group's menus (if any)
                    if (item.menus && item.menus.length > 0) {
                        flattenMenus(item.menus, item.groupName, [], depth + 1);
                    }
                }
                // Handle menu items with children
                else if (item.children && item.children.length > 0) {

                    // Don't add parent menus with url "#" - they're not navigable
                    // Just pass them in the path for their children
                    const newPath = [...parentPath, item.name];

                    // Recursively flatten children
                    flattenMenus(item.children, groupName, newPath, depth + 1);
                }
                // Handle direct menu items (leaf nodes)
                else if (item.url && item.url !== "#") {
                    // Build the label from the full path
                    const fullPath = groupName
                        ? [groupName, ...parentPath, item.name]
                        : [...parentPath, item.name];
                    const label = fullPath.join(" > ");

                    console.log(
                        `${"  ".repeat(depth)}    ➕ Adding leaf menu: ${label}`
                    );
                    options.push({
                        value: item.url,
                        label: label,
                        name: item.name,
                        group: groupName,
                        parent: parentPath.join(" > "),
                    });
                }
            });
        };

        flattenMenus(menuData);

        setSearchOptions(options);
    }, [menuData]);

    // Listen for Ctrl+S to focus the search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                if (selectRef.current) {
                    selectRef.current.focus();
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleSelect = (selectedOption) => {
        if (selectedOption && selectedOption.value) {
            navigate(selectedOption.value);
            // Clear selection after navigation
            if (selectRef.current) {
                selectRef.current.clearValue();
            }
        }
    };

    // Vyaris-themed react-select with a wider control on this surface.
    const customStyles = {
        ...vySelectStyles,
        control: (base, state) => ({
            ...vySelectStyles.control(base, state),
            minWidth: 350,
            maxWidth: 500,
            cursor: "text",
        }),
    };

    return (
        <div
            style={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                maxWidth: "600px",
                margin: "0 20px",
            }}
        >
            <Select
                ref={selectRef}
                options={searchOptions}
                onChange={handleSelect}
                placeholder="Search menus... (Ctrl+S)"
                styles={customStyles}
                isClearable
                noOptionsMessage={() => "No menus found"}
            />
        </div>
    );
};

export default UniversalSearch;
