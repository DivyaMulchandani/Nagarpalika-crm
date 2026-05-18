import React, { useState } from "react";
import {
    Input,
    Label,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
} from "reactstrap";
import "./IconPicker.css";

// Popular icons from Remix Icon and Boxicons libraries
const ICON_LIST = [
    // Common/Popular Icons
    { name: "No Icon", class: "" },
    { name: "Home", class: "ri-home-line" },
    { name: "Dashboard", class: "ri-dashboard-line" },
    { name: "Settings", class: "ri-settings-line" },
    { name: "User", class: "ri-user-line" },
    { name: "Users", class: "ri-team-line" },
    { name: "File", class: "ri-file-line" },
    { name: "Folder", class: "ri-folder-line" },
    { name: "Mail", class: "ri-mail-line" },
    { name: "Calendar", class: "ri-calendar-line" },
    { name: "Clock", class: "ri-time-line" },
    { name: "Bell", class: "ri-notification-line" },
    { name: "Chart", class: "ri-bar-chart-line" },
    { name: "Grid", class: "ri-grid-line" },
    { name: "List", class: "ri-list-check" },
    { name: "Menu", class: "ri-menu-line" },
    { name: "Search", class: "ri-search-line" },
    { name: "Filter", class: "ri-filter-line" },
    { name: "Edit", class: "ri-edit-line" },
    { name: "Delete", class: "ri-delete-bin-line" },
    { name: "Add", class: "ri-add-line" },
    { name: "Close", class: "ri-close-line" },
    { name: "Check", class: "ri-check-line" },
    { name: "Info", class: "ri-information-line" },
    { name: "Warning", class: "ri-error-warning-line" },
    { name: "Star", class: "ri-star-line" },
    { name: "Heart", class: "ri-heart-line" },
    { name: "Lock", class: "ri-lock-line" },
    { name: "Unlock", class: "ri-lock-unlock-line" },
    { name: "Eye", class: "ri-eye-line" },
    { name: "Download", class: "ri-download-line" },
    { name: "Upload", class: "ri-upload-line" },
    { name: "Share", class: "ri-share-line" },
    { name: "Link", class: "ri-link" },
    { name: "External Link", class: "ri-external-link-line" },
    { name: "Phone", class: "ri-phone-line" },
    { name: "Map Pin", class: "ri-map-pin-line" },
    { name: "Building", class: "ri-building-line" },
    { name: "Bank", class: "ri-bank-line" },
    { name: "Store", class: "ri-store-line" },
    { name: "Shopping Cart", class: "ri-shopping-cart-line" },
    { name: "Money", class: "ri-money-dollar-circle-line" },
    { name: "Wallet", class: "ri-wallet-line" },
    { name: "Credit Card", class: "ri-bank-card-line" },
    { name: "Book", class: "ri-book-line" },
    { name: "Bookmark", class: "ri-bookmark-line" },
    { name: "Award", class: "ri-award-line" },
    { name: "Trophy", class: "ri-trophy-line" },
    { name: "Gift", class: "ri-gift-line" },
    { name: "Image", class: "ri-image-line" },
    { name: "Camera", class: "ri-camera-line" },
    { name: "Video", class: "ri-video-line" },
    { name: "Music", class: "ri-music-line" },
    { name: "Language", class: "ri-global-line" },

    // Boxicons alternatives
    { name: "Home (Box)", class: "bx bx-home" },
    { name: "User (Box)", class: "bx bx-user" },
    { name: "Users (Box)", class: "bx bx-group" },
    { name: "Settings (Box)", class: "bx bx-cog" },
    { name: "File (Box)", class: "bx bx-file" },
    { name: "Folder (Box)", class: "bx bx-folder" },
    { name: "Menu (Box)", class: "bx bx-menu" },
    { name: "Grid (Box)", class: "bx bx-grid-alt" },
    { name: "Chart (Box)", class: "bx bx-bar-chart" },
    { name: "Calendar (Box)", class: "bx bx-calendar" },
    { name: "Mail (Box)", class: "bx bx-envelope" },
    { name: "Bell (Box)", class: "bx bx-bell" },
    { name: "Search (Box)", class: "bx bx-search" },
    { name: "Shopping Cart (Box)", class: "bx bx-cart" },
    { name: "Money (Box)", class: "bx bx-dollar" },
    { name: "Award (Box)", class: "bx bx-award" },
    { name: "Star (Box)", class: "bx bx-star" },
];

const IconPicker = ({ value, onChange, label, error, required }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const toggle = () => setDropdownOpen(!dropdownOpen);

    const filteredIcons = ICON_LIST.filter(
        (icon) =>
            icon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            icon.class.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleIconSelect = (iconClass) => {
        onChange(iconClass);
        setDropdownOpen(false);
        setSearchTerm("");
    };

    const selectedIcon = ICON_LIST.find((icon) => icon.class === value);

    return (
        <div className="icon-picker-wrapper mb-3">
            <Label>
                {label} {required && <span className="text-danger">*</span>}
            </Label>
            <Dropdown isOpen={dropdownOpen} toggle={toggle} className="w-100">
                <DropdownToggle
                    caret
                    className="w-100 d-flex align-items-center justify-content-between icon-picker-toggle"
                    style={{
                        backgroundColor: "white",
                        border: "1px solid #ced4da",
                        color: "#495057",
                        padding: "0.65rem 1rem",
                        borderRadius: "0.375rem",
                        height: "48px",
                    }}
                >
                    <div className="d-flex align-items-center">
                        {value && (
                            <i
                                className={`${value} me-2`}
                                style={{ fontSize: "18px" }}
                            ></i>
                        )}
                        <span>
                            {selectedIcon ? selectedIcon.name : "Select Icon"}
                        </span>
                    </div>
                </DropdownToggle>
                <DropdownMenu
                    className="icon-picker-menu"
                    style={{
                        maxHeight: "400px",
                        overflowY: "auto",
                        width: "100%",
                    }}
                >
                    <div
                        className="p-2"
                        style={{
                            position: "sticky",
                            top: 0,
                            backgroundColor: "white",
                            borderBottom: "1px solid #dee2e6",
                            zIndex: 1,
                        }}
                    >
                        <Input
                            type="text"
                            placeholder="Search icons..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="p-2">
                        <div
                            className="icon-grid"
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fill, minmax(120px, 1fr))",
                                gap: "8px",
                            }}
                        >
                            {filteredIcons.map((icon, index) => (
                                <DropdownItem
                                    key={index}
                                    onClick={() => handleIconSelect(icon.class)}
                                    className={`icon-item ${
                                        value === icon.class ? "active" : ""
                                    }`}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        padding: "12px 8px",
                                        cursor: "pointer",
                                        borderRadius: "4px",
                                        border:
                                            value === icon.class
                                                ? "2px solid #009069"
                                                : "1px solid transparent",
                                        backgroundColor:
                                            value === icon.class
                                                ? "rgba(0, 144, 105, 0.1)"
                                                : "transparent",
                                        transition: "all 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (value !== icon.class) {
                                            e.currentTarget.style.backgroundColor =
                                                "#f8f9fa";
                                            e.currentTarget.style.borderColor =
                                                "#dee2e6";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (value !== icon.class) {
                                            e.currentTarget.style.backgroundColor =
                                                "transparent";
                                            e.currentTarget.style.borderColor =
                                                "transparent";
                                        }
                                    }}
                                >
                                    {icon.class && (
                                        <i
                                            className={icon.class}
                                            style={{
                                                fontSize: "24px",
                                                marginBottom: "4px",
                                            }}
                                        ></i>
                                    )}
                                    {!icon.class && (
                                        <div
                                            style={{
                                                height: "24px",
                                                marginBottom: "4px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "12px",
                                                    color: "#999",
                                                }}
                                            >
                                                None
                                            </span>
                                        </div>
                                    )}
                                    <small
                                        style={{
                                            fontSize: "10px",
                                            textAlign: "center",
                                            wordBreak: "break-word",
                                        }}
                                    >
                                        {icon.name}
                                    </small>
                                </DropdownItem>
                            ))}
                        </div>
                        {filteredIcons.length === 0 && (
                            <div className="text-center text-muted p-3">
                                No icons found
                            </div>
                        )}
                    </div>
                </DropdownMenu>
            </Dropdown>
            {error && <p className="text-danger mt-1 small">{error}</p>}
            <small className="form-text text-muted">
                Icon will be displayed in the sidebar menu
            </small>
        </div>
    );
};

export default IconPicker;
