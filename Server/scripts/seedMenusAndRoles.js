/**
 * HMS Database Seed Script
 * ========================
 * 1. Deletes test data (patients, doctors, employees, appointments, treatments, invoices, payments, whatsapp, sessions)
 * 2. Deletes existing menus, menu groups, roles, and employee roles
 * 3. Seeds proper menu structure matching all HMS routes
 * 4. Seeds roles: SUPER_ADMIN, CLINIC_MANAGER, RECEPTIONIST, DOCTOR, ACCOUNTANT
 * 5. Seeds employee role permissions per role
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

// ─── Schema Definitions (inline to avoid import issues) ───

const MenuGroupSchema = new mongoose.Schema(
  {
    menuGroupName: { type: String, required: true },
    sequence: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    isLink: { type: Boolean, default: false },
    menuUrl: { type: String, default: "#" },
    icon: { type: String, default: "" },
  },
  { timestamps: true }
);

const MenuSchema = new mongoose.Schema(
  {
    menuName: { type: String, required: true },
    menuGroup: { type: mongoose.Schema.Types.ObjectId, ref: "MenuGroupMaster", required: true },
    menuUrl: { type: String, required: true },
    sequence: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    isParent: { type: Boolean, default: false },
    parentMenu: { type: mongoose.Schema.Types.ObjectId, ref: "MenuMaster", default: null },
    icon: { type: String, default: "" },
  },
  { timestamps: true }
);

const RoleSchema = new mongoose.Schema(
  {
    roleName: { type: String, required: true, unique: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const EmployeeRolesSchema = new mongoose.Schema(
  {
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: "RoleMaster", required: true },
    roles: [
      {
        menuId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuMaster", default: null },
        menuGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuGroupMaster", default: null },
        read: { type: Boolean, default: false },
        write: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        print: { type: Boolean, default: false },
        mail: { type: Boolean, default: false },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const MenuGroup = mongoose.model("MenuGroupMaster", MenuGroupSchema);
const Menu = mongoose.model("MenuMaster", MenuSchema);
const Role = mongoose.model("RoleMaster", RoleSchema);
const EmployeeRoles = mongoose.model("EmployeeRoles", EmployeeRolesSchema);

// ─── Menu Structure Definition ───
// Matches allRoutes.jsx exactly

const MENU_STRUCTURE = [
  // 1. Dashboard (direct link)
  {
    group: { name: "Dashboard", icon: "ri-dashboard-2-line", isLink: true, menuUrl: "/dashboard", sequence: 1 },
    menus: [],
  },

  // 2. Patients (direct link)
  {
    group: { name: "Patients", icon: "ri-user-heart-line", isLink: true, menuUrl: "/patients", sequence: 2 },
    menus: [],
  },

  // 3. Appointments (group with sub-menus)
  {
    group: { name: "Appointments", icon: "ri-calendar-check-line", isLink: false, sequence: 3 },
    menus: [
      { name: "All Appointments", url: "/appointments", sequence: 1 },
      { name: "Follow-Up Queue", url: "/follow-up-queue", sequence: 2 },
    ],
  },

  // 4. Billing (group)
  {
    group: { name: "Billing", icon: "ri-money-rupee-circle-line", isLink: false, sequence: 4 },
    menus: [
      { name: "Invoices", url: "/invoices", sequence: 1 },
    ],
  },

  // 5. Reports (direct link)
  {
    group: { name: "Reports", icon: "ri-bar-chart-box-line", isLink: true, menuUrl: "/reports", sequence: 5 },
    menus: [],
  },

  // 6. WhatsApp (direct link)
  {
    group: { name: "WhatsApp", icon: "ri-whatsapp-line", isLink: true, menuUrl: "/whatsapp", sequence: 6 },
    menus: [],
  },

  // 7. Setup (group with sub-groups)
  {
    group: { name: "Setup", icon: "ri-settings-3-line", isLink: false, sequence: 7 },
    menus: [
      { name: "Company Details", url: "/company-details", sequence: 1 },
      { name: "Departments", url: "/department", sequence: 2 },
      { name: "Doctors", url: "/doctor", sequence: 3 },
      { name: "Employees", url: "/employee", sequence: 4 },
      { name: "Employee Roles", url: "/employee-roles", sequence: 5 },
      // Location sub-group
      {
        name: "Location", url: "#", sequence: 6, isParent: true,
        children: [
          { name: "Country", url: "/country", sequence: 1 },
          { name: "State", url: "/state", sequence: 2 },
          { name: "City", url: "/city", sequence: 3 },
        ],
      },
      // CMS / Email sub-group
      {
        name: "Email / CMS", url: "#", sequence: 7, isParent: true,
        children: [
          { name: "Email Setup", url: "/email-setup", sequence: 1 },
          { name: "Email For", url: "/email-for", sequence: 2 },
          { name: "Email Template", url: "/email-template", sequence: 3 },
        ],
      },
    ],
  },

  // 8. Master (group — admin config pages)
  {
    group: { name: "Master", icon: "ri-database-2-line", isLink: false, sequence: 8 },
    menus: [
      { name: "Master Data", url: "/master-data", sequence: 1 },
      { name: "Menu Groups", url: "/menu-group", sequence: 2 },
      { name: "Menu Master", url: "/menu-master", sequence: 3 },
      { name: "Role Master", url: "/role-master", sequence: 4 },
      { name: "Currency Master", url: "/currency-master", sequence: 5 },
    ],
  },
];

// ─── Role Definitions ───

const ROLES = [
  "SUPER_ADMIN",      // Full access to everything
  "CLINIC_MANAGER",   // Manages clinic ops: patients, appointments, billing, reports, setup (no master config)
  "RECEPTIONIST",     // Front desk: patients, appointments, follow-ups, basic billing
  "DOCTOR",           // Clinical: dashboard, patients (read), appointments, consultation, follow-ups
  "ACCOUNTANT",       // Financial: billing, invoices, reports, patients (read)
];

// Permission templates per role
// Keys are menu URLs — matched to the flat list of all leaf menus + direct-link groups
const FULL = { read: true, write: true, edit: true, delete: true, print: true, mail: true };
const READ_ONLY = { read: true, write: false, edit: false, delete: false, print: true, mail: false };
const READ_WRITE = { read: true, write: true, edit: true, delete: false, print: true, mail: false };
const READ_WRITE_DELETE = { read: true, write: true, edit: true, delete: true, print: true, mail: false };
const NO_ACCESS = { read: false, write: false, edit: false, delete: false, print: false, mail: false };

// Map: roleName -> { menuUrl: permissionObject }
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: {
    // Full access to everything — will be applied to all menus
    _allMenus: FULL,
  },

  CLINIC_MANAGER: {
    "/dashboard": FULL,
    "/patients": FULL,
    "/appointments": FULL,
    "/follow-up-queue": FULL,

    "/invoices": FULL,
    "/reports": FULL,
    "/whatsapp": FULL,
    "/company-details": READ_ONLY,
    "/department": READ_WRITE_DELETE,
    "/doctor": READ_WRITE_DELETE,
    "/employee": READ_WRITE_DELETE,
    "/employee-roles": READ_WRITE,
    "/country": READ_ONLY,
    "/state": READ_ONLY,
    "/city": READ_ONLY,
    "/email-setup": READ_WRITE,
    "/email-for": READ_WRITE,
    "/email-template": READ_WRITE,
    // No master config access
    "/master-data": NO_ACCESS,
    "/menu-group": NO_ACCESS,
    "/menu-master": NO_ACCESS,
    "/role-master": NO_ACCESS,
    "/currency-master": NO_ACCESS,
  },

  RECEPTIONIST: {
    "/dashboard": READ_ONLY,
    "/patients": READ_WRITE,
    "/appointments": READ_WRITE,
    "/follow-up-queue": READ_ONLY,

    "/invoices": READ_WRITE,
    "/reports": NO_ACCESS,
    "/whatsapp": READ_ONLY,
    "/company-details": NO_ACCESS,
    "/department": NO_ACCESS,
    "/doctor": READ_ONLY,
    "/employee": NO_ACCESS,
    "/employee-roles": NO_ACCESS,
    "/country": NO_ACCESS,
    "/state": NO_ACCESS,
    "/city": NO_ACCESS,
    "/email-setup": NO_ACCESS,
    "/email-for": NO_ACCESS,
    "/email-template": NO_ACCESS,
    "/master-data": NO_ACCESS,
    "/menu-group": NO_ACCESS,
    "/menu-master": NO_ACCESS,
    "/role-master": NO_ACCESS,
    "/currency-master": NO_ACCESS,
  },

  DOCTOR: {
    "/dashboard": READ_ONLY,
    "/patients": NO_ACCESS,
    "/appointments": READ_WRITE,
    "/follow-up-queue": READ_WRITE,

    "/invoices": NO_ACCESS,
    "/reports": READ_ONLY,
    "/whatsapp": NO_ACCESS,
    "/company-details": NO_ACCESS,
    "/department": NO_ACCESS,
    "/doctor": NO_ACCESS,
    "/employee": NO_ACCESS,
    "/employee-roles": NO_ACCESS,
    "/country": NO_ACCESS,
    "/state": NO_ACCESS,
    "/city": NO_ACCESS,
    "/email-setup": NO_ACCESS,
    "/email-for": NO_ACCESS,
    "/email-template": NO_ACCESS,
    "/master-data": NO_ACCESS,
    "/menu-group": NO_ACCESS,
    "/menu-master": NO_ACCESS,
    "/role-master": NO_ACCESS,
    "/currency-master": NO_ACCESS,
  },

  ACCOUNTANT: {
    "/dashboard": READ_ONLY,
    "/patients": READ_ONLY,
    "/appointments": READ_ONLY,
    "/follow-up-queue": NO_ACCESS,

    "/invoices": FULL,
    "/reports": FULL,
    "/whatsapp": NO_ACCESS,
    "/company-details": NO_ACCESS,
    "/department": NO_ACCESS,
    "/doctor": NO_ACCESS,
    "/employee": NO_ACCESS,
    "/employee-roles": NO_ACCESS,
    "/country": NO_ACCESS,
    "/state": NO_ACCESS,
    "/city": NO_ACCESS,
    "/email-setup": NO_ACCESS,
    "/email-for": NO_ACCESS,
    "/email-template": NO_ACCESS,
    "/master-data": NO_ACCESS,
    "/menu-group": NO_ACCESS,
    "/menu-master": NO_ACCESS,
    "/role-master": NO_ACCESS,
    "/currency-master": NO_ACCESS,
  },
};

// ─── Main Seed Function ───

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected.\n");

  const db = mongoose.connection.db;

  // ────────────────────────────────────────
  // STEP 1: Delete test data
  // ────────────────────────────────────────
  console.log("═══════════════════════════════════════");
  console.log("STEP 1: Cleaning up test data");
  console.log("═══════════════════════════════════════");

  const collectionsToClean = [
    "patients",
    "patientdocuments",
    "doctors",
    "employees",
    "appointments",
    "treatmentplans",
    "invoices",
    "payments",
    "whatsappmessages",
    "whatsappconfigs",
    "sessions",
    "hms_sessions",
    "counters",
    "otps",
  ];

  for (const colName of collectionsToClean) {
    try {
      const col = db.collection(colName);
      const count = await col.countDocuments();
      if (count > 0) {
        await col.deleteMany({});
        console.log(`  Deleted ${count} docs from ${colName}`);
      } else {
        console.log(`  ${colName}: already empty`);
      }
    } catch {
      console.log(`  ${colName}: collection not found, skipping`);
    }
  }

  // ────────────────────────────────────────
  // STEP 2: Delete existing menus, roles, permissions
  // ────────────────────────────────────────
  console.log("\n═══════════════════════════════════════");
  console.log("STEP 2: Clearing menus, roles, permissions");
  console.log("═══════════════════════════════════════");

  const deletedMenus = await Menu.deleteMany({});
  console.log(`  Deleted ${deletedMenus.deletedCount} menus`);

  const deletedGroups = await MenuGroup.deleteMany({});
  console.log(`  Deleted ${deletedGroups.deletedCount} menu groups`);

  const deletedPermissions = await EmployeeRoles.deleteMany({});
  console.log(`  Deleted ${deletedPermissions.deletedCount} employee role permission sets`);

  const deletedRoles = await Role.deleteMany({});
  console.log(`  Deleted ${deletedRoles.deletedCount} roles`);

  // ────────────────────────────────────────
  // STEP 3: Seed menu groups and menus
  // ────────────────────────────────────────
  console.log("\n═══════════════════════════════════════");
  console.log("STEP 3: Seeding menu structure");
  console.log("═══════════════════════════════════════");

  // Collect all created leaf menus and direct-link groups for permission mapping
  // urlToId: { menuUrl -> { menuId, menuGroupId } }
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

    console.log(`  [Group] ${entry.group.name} (seq: ${entry.group.sequence}, isLink: ${entry.group.isLink || false})`);

    // If it's a direct-link group, store it for permissions
    if (entry.group.isLink && entry.group.menuUrl !== "#") {
      urlToIds[entry.group.menuUrl] = { menuId: null, menuGroupId: groupDoc._id };
    }

    // Create child menus
    for (const menu of entry.menus) {
      if (menu.isParent && menu.children) {
        // Create parent menu
        const parentDoc = await Menu.create({
          menuName: menu.name,
          menuGroup: groupDoc._id,
          menuUrl: menu.url,
          sequence: menu.sequence,
          isActive: true,
          isParent: true,
          parentMenu: null,
        });
        console.log(`    [Parent] ${menu.name}`);

        // Create children under parent
        for (const child of menu.children) {
          const childDoc = await Menu.create({
            menuName: child.name,
            menuGroup: groupDoc._id,
            menuUrl: child.url,
            sequence: child.sequence,
            isActive: true,
            isParent: false,
            parentMenu: parentDoc._id,
          });
          console.log(`      [Menu] ${child.name} -> ${child.url}`);
          urlToIds[child.url] = { menuId: childDoc._id, menuGroupId: groupDoc._id };
        }
      } else {
        // Leaf menu
        const menuDoc = await Menu.create({
          menuName: menu.name,
          menuGroup: groupDoc._id,
          menuUrl: menu.url,
          sequence: menu.sequence,
          isActive: true,
          isParent: false,
          parentMenu: null,
        });
        console.log(`    [Menu] ${menu.name} -> ${menu.url}`);
        urlToIds[menu.url] = { menuId: menuDoc._id, menuGroupId: groupDoc._id };
      }
    }
  }

  const totalMenus = await Menu.countDocuments();
  const totalGroups = await MenuGroup.countDocuments();
  console.log(`\n  Total: ${totalGroups} groups, ${totalMenus} menus`);

  // ────────────────────────────────────────
  // STEP 4: Seed roles
  // ────────────────────────────────────────
  console.log("\n═══════════════════════════════════════");
  console.log("STEP 4: Seeding roles");
  console.log("═══════════════════════════════════════");

  const roleMap = {}; // roleName -> roleDoc
  for (const roleName of ROLES) {
    const roleDoc = await Role.create({ roleName, isActive: true });
    roleMap[roleName] = roleDoc;
    console.log(`  [Role] ${roleName} (${roleDoc._id})`);
  }

  // ────────────────────────────────────────
  // STEP 5: Seed employee role permissions
  // ────────────────────────────────────────
  console.log("\n═══════════════════════════════════════");
  console.log("STEP 5: Seeding role permissions");
  console.log("═══════════════════════════════════════");

  const allMenuUrls = Object.keys(urlToIds);

  for (const roleName of ROLES) {
    const roleDoc = roleMap[roleName];
    const permConfig = ROLE_PERMISSIONS[roleName];
    const roles = [];

    for (const url of allMenuUrls) {
      const ids = urlToIds[url];

      let perms;
      if (permConfig._allMenus) {
        perms = permConfig._allMenus;
      } else {
        perms = permConfig[url] || NO_ACCESS;
      }

      roles.push({
        menuId: ids.menuId || null,
        menuGroupId: ids.menuGroupId,
        read: perms.read,
        write: perms.write,
        edit: perms.edit,
        delete: perms.delete,
        print: perms.print,
        mail: perms.mail,
      });
    }

    await EmployeeRoles.create({
      roleId: roleDoc._id,
      roles,
      isActive: true,
    });

    const accessCount = roles.filter((r) => r.read).length;
    console.log(`  [Permissions] ${roleName}: ${accessCount}/${allMenuUrls.length} menus accessible`);
  }

  // ────────────────────────────────────────
  // Summary
  // ────────────────────────────────────────
  console.log("\n═══════════════════════════════════════");
  console.log("SEED COMPLETE");
  console.log("═══════════════════════════════════════");
  console.log(`  Menu Groups: ${totalGroups}`);
  console.log(`  Menus:       ${totalMenus}`);
  console.log(`  Roles:       ${ROLES.length}`);
  console.log(`  Permission Sets: ${ROLES.length}`);
  console.log("\n  Roles created:");
  for (const roleName of ROLES) {
    console.log(`    - ${roleName}`);
  }
  console.log("\n  Menu structure:");
  for (const entry of MENU_STRUCTURE) {
    const prefix = entry.group.isLink ? "→" : "▼";
    console.log(`    ${prefix} ${entry.group.name} (${entry.group.icon})`);
    for (const menu of entry.menus) {
      if (menu.isParent && menu.children) {
        console.log(`      ▼ ${menu.name}`);
        for (const child of menu.children) {
          console.log(`        → ${child.name} (${child.url})`);
        }
      } else {
        console.log(`      → ${menu.name} (${menu.url})`);
      }
    }
  }

  await mongoose.disconnect();
  console.log("\nDisconnected. Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
