/**
 * Nagar Palika Recruitment Portal — Seed Script
 * ================================================
 * 1. Cleans test data collections
 * 2. Clears existing menus, menu groups, roles, permissions
 * 3. Seeds recruitment-specific menu structure
 * 4. Seeds roles: ADMIN, EMPLOYEE, DEPT_ADMIN
 * 5. Seeds role permissions per menu
 *
 * Usage: node scripts/seedMenusAndRoles.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const MONGO_URI = process.env.DATABASE;

// ─── Inline Schemas ──────────────────────────────────────────────────────────

const MenuGroupSchema = new mongoose.Schema(
  {
    menuGroupName: { type: String, required: true },
    sequence: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    isLink: { type: Boolean, default: false },
    menuUrl: { type: String, default: "#" },
    icon: { type: String, default: "" },
  },
  { timestamps: true },
);

const MenuSchema = new mongoose.Schema(
  {
    menuName: { type: String, required: true },
    menuGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuGroupMaster",
      required: true,
    },
    menuUrl: { type: String, required: true },
    sequence: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    isParent: { type: Boolean, default: false },
    parentMenu: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuMaster",
      default: null,
    },
    icon: { type: String, default: "" },
  },
  { timestamps: true },
);

const RoleSchema = new mongoose.Schema(
  {
    roleName: { type: String, required: true, unique: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const EmployeeRolesSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoleMaster",
      required: true,
    },
    roles: [
      {
        menuId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MenuMaster",
          default: null,
        },
        menuGroupId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MenuGroupMaster",
          default: null,
        },
        read: Boolean,
        write: Boolean,
        delete: Boolean,
        edit: Boolean,
        print: Boolean,
        mail: Boolean,
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const MenuGroup = mongoose.model("MenuGroupMaster", MenuGroupSchema);
const Menu = mongoose.model("MenuMaster", MenuSchema);
const Role = mongoose.model("RoleMaster", RoleSchema);
const EmployeeRoles = mongoose.model("EmployeeRoles", EmployeeRolesSchema);

// ─── Menu Structure ──────────────────────────────────────────────────────────
// Matches Admin/src/Routes/allRoutes.jsx (recruitment routes only).
// Recruitment-specific sections (Advertisements, Candidates, Applications,
// Fee Payments, Call Letters, Notice Board) will be added in Phase 1.

const MENU_STRUCTURE = [
  {
    group: {
      name: "Dashboard",
      icon: "ri-dashboard-2-line",
      isLink: true,
      menuUrl: "/dashboard",
      sequence: 1,
    },
    menus: [],
  },
  {
    group: {
      name: "Setup",
      icon: "ri-settings-3-line",
      isLink: false,
      sequence: 2,
    },
    menus: [
      { name: "Nagar Palika Details", url: "/company-details", sequence: 1 },
      { name: "Departments", url: "/department", sequence: 2 },
      { name: "Admin Users", url: "/employee", sequence: 3 },
      { name: "Admin Roles", url: "/employee-roles", sequence: 4 },
    ],
  },
  {
    group: {
      name: "Location Master",
      icon: "ri-map-pin-2-line",
      isLink: false,
      sequence: 3,
    },
    menus: [
      { name: "Country", url: "/country", sequence: 1 },
      { name: "State", url: "/state", sequence: 2 },
      { name: "City", url: "/city", sequence: 3 },
    ],
  },
  {
    group: {
      name: "Master Data",
      icon: "ri-list-settings-line",
      isLink: true,
      menuUrl: "/master-data",
      sequence: 4,
    },
    menus: [],
  },
  {
    group: {
      name: "Notifications",
      icon: "ri-notification-3-line",
      isLink: false,
      sequence: 5,
    },
    menus: [
      { name: "Email Setup", url: "/email-setup", sequence: 1 },
      { name: "Email Types", url: "/email-for", sequence: 2 },
      { name: "Email Templates", url: "/email-template", sequence: 3 },
    ],
  },
  {
    group: {
      name: "Access Control",
      icon: "ri-shield-keyhole-line",
      isLink: false,
      sequence: 6,
    },
    menus: [
      { name: "Role Master", url: "/role-master", sequence: 1 },
      { name: "Menu Master", url: "/menu-master", sequence: 2 },
      { name: "Menu Groups", url: "/menu-group", sequence: 3 },
    ],
  },
  {
    group: {
      name: "Reports",
      icon: "ri-bar-chart-box-line",
      isLink: true,
      menuUrl: "/reports",
      sequence: 7,
    },
    menus: [],
  },
  {
    group: {
      name: "Recruitment",
      icon: "ri-user-search-line",
      isLink: false,
      sequence: 8,
    },
    menus: [
      { name: "Advertisements", url: "/advertisements", sequence: 1 },
      { name: "Candidates", url: "/candidates", sequence: 2 },
      { name: "Applications", url: "/applications", sequence: 3 },
      { name: "Fee Payments", url: "/fee-payments", sequence: 4 },
      { name: "Call Letters", url: "/call-letters", sequence: 5 },
      { name: "Notice Board", url: "/notices", sequence: 6 },
    ],
  },
];

// ─── Roles ───────────────────────────────────────────────────────────────────

const ROLES = ["ADMIN", "EMPLOYEE", "DEPT_ADMIN"];

const FULL = {
  read: true,
  write: true,
  edit: true,
  delete: true,
  print: true,
  mail: true,
};
const READ_WRITE = {
  read: true,
  write: true,
  edit: true,
  delete: false,
  print: true,
  mail: false,
};
const READ_ONLY = {
  read: true,
  write: false,
  edit: false,
  delete: false,
  print: true,
  mail: false,
};
const NO_ACCESS = {
  read: false,
  write: false,
  edit: false,
  delete: false,
  print: false,
  mail: false,
};

const ROLE_PERMISSIONS = {
  ADMIN: { _allMenus: FULL },

  EMPLOYEE: {
    "/dashboard": READ_ONLY,
    "/company-details": READ_ONLY,
    "/department": READ_ONLY,
    "/employee": NO_ACCESS,
    "/employee-roles": NO_ACCESS,
    "/country": READ_ONLY,
    "/state": READ_ONLY,
    "/city": READ_ONLY,
    "/master-data": READ_ONLY,
    "/email-setup": READ_ONLY,
    "/email-for": READ_ONLY,
    "/email-template": READ_WRITE,
    "/role-master": NO_ACCESS,
    "/menu-master": NO_ACCESS,
    "/menu-group": NO_ACCESS,
    "/reports": READ_ONLY,
    "/advertisements": READ_WRITE,
    "/candidates": READ_ONLY,
    "/applications": READ_ONLY,
    "/fee-payments": READ_ONLY,
    "/call-letters": READ_WRITE,
    "/notices": READ_WRITE,
  },

  DEPT_ADMIN: {
    "/dashboard": READ_ONLY,
    "/company-details": READ_ONLY,
    "/department": READ_ONLY,
    "/employee": NO_ACCESS,
    "/employee-roles": NO_ACCESS,
    "/country": READ_ONLY,
    "/state": READ_ONLY,
    "/city": READ_ONLY,
    "/master-data": READ_ONLY,
    "/email-setup": NO_ACCESS,
    "/email-for": NO_ACCESS,
    "/email-template": NO_ACCESS,
    "/role-master": NO_ACCESS,
    "/menu-master": NO_ACCESS,
    "/menu-group": NO_ACCESS,
    "/reports": READ_ONLY,
    "/advertisements": READ_WRITE,
    "/candidates": READ_ONLY,
    "/applications": READ_ONLY,
    "/fee-payments": READ_ONLY,
    "/call-letters": READ_ONLY,
    "/notices": READ_WRITE,
  },
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected.\n");

  const db = mongoose.connection.db;

  // Step 1 — Clean stale test collections
  const toClean = ["employees", "sessions", "counters", "otps"];
  console.log("=== Step 1: Clean test data ===");
  for (const col of toClean) {
    try {
      const count = await db.collection(col).countDocuments();
      if (count > 0) {
        await db.collection(col).deleteMany({});
        console.log(`  Cleared ${count} from ${col}`);
      } else console.log(`  ${col}: empty`);
    } catch {
      console.log(`  ${col}: not found`);
    }
  }

  // Step 2 — Clear menus, roles, permissions
  console.log("\n=== Step 2: Clear menus/roles ===");
  console.log(`  Deleted ${(await Menu.deleteMany({})).deletedCount} menus`);
  console.log(
    `  Deleted ${(await MenuGroup.deleteMany({})).deletedCount} groups`,
  );
  console.log(
    `  Deleted ${(await EmployeeRoles.deleteMany({})).deletedCount} permission sets`,
  );
  console.log(`  Deleted ${(await Role.deleteMany({})).deletedCount} roles`);

  // Step 3 — Seed menu structure
  console.log("\n=== Step 3: Seed menu structure ===");
  const urlToIds = {};

  for (const entry of MENU_STRUCTURE) {
    const groupDoc = await MenuGroup.create({
      menuGroupName: entry.group.name,
      sequence: entry.group.sequence,
      isActive: true,
      isLink: entry.group.isLink || false,
      menuUrl: entry.group.menuUrl || "#",
      icon: entry.group.icon || "",
    });
    console.log(`  [Group] ${entry.group.name}`);

    if (entry.group.isLink && entry.group.menuUrl !== "#") {
      urlToIds[entry.group.menuUrl] = {
        menuId: null,
        menuGroupId: groupDoc._id,
      };
    }

    for (const menu of entry.menus) {
      const menuDoc = await Menu.create({
        menuName: menu.name,
        menuGroup: groupDoc._id,
        menuUrl: menu.url,
        sequence: menu.sequence,
        isActive: true,
        isParent: false,
        parentMenu: null,
      });
      console.log(`    [Menu] ${menu.name} → ${menu.url}`);
      urlToIds[menu.url] = { menuId: menuDoc._id, menuGroupId: groupDoc._id };
    }
  }

  // Step 4 — Seed roles
  console.log("\n=== Step 4: Seed roles ===");
  const roleMap = {};
  for (const roleName of ROLES) {
    roleMap[roleName] = await Role.create({ roleName, isActive: true });
    console.log(`  [Role] ${roleName}`);
  }

  // Step 5 — Seed permissions
  console.log("\n=== Step 5: Seed permissions ===");
  const allUrls = Object.keys(urlToIds);

  for (const roleName of ROLES) {
    const permConfig = ROLE_PERMISSIONS[roleName];
    const roles = allUrls.map((url) => {
      const ids = urlToIds[url];
      const perms = permConfig._allMenus
        ? permConfig._allMenus
        : permConfig[url] || NO_ACCESS;
      return {
        menuId: ids.menuId || null,
        menuGroupId: ids.menuGroupId,
        ...perms,
      };
    });

    await EmployeeRoles.create({
      roleId: roleMap[roleName]._id,
      roles,
      isActive: true,
    });
    const readable = roles.filter((r) => r.read).length;
    console.log(
      `  [Permissions] ${roleName}: ${readable}/${allUrls.length} menus accessible`,
    );
  }

  console.log("\n✅ Seed complete");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
