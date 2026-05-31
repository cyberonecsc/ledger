/* ==========================================================================
   CYBERONE Center Management Platform - Auth & Privileges (auth.js)
   ========================================================================== */

// Default permissions matrix for roles
const DEFAULT_PRIVILEGES = {
  owner: {
    view_balances: true,
    edit_balances: true,
    manage_ledger: true,
    manage_applications: true,
    manage_accounts: true,
    manage_customers: true,
    manage_inventory: true,
    manage_payroll: true,
    manage_settings: true
  },
  admin: {
    view_balances: true,
    edit_balances: true,
    manage_ledger: true,
    manage_applications: true,
    manage_accounts: true,
    manage_customers: true,
    manage_inventory: true,
    manage_payroll: true,
    manage_settings: false
  },
  accountant: {
    view_balances: true,
    edit_balances: false,
    manage_ledger: true,
    manage_applications: true,
    manage_accounts: true,
    manage_customers: true,
    manage_inventory: false,
    manage_payroll: true,
    manage_settings: false
  },
  staff: {
    view_balances: false, // Staff cannot see Cash In Hand total & bank balance
    edit_balances: false,
    manage_ledger: true, // Staff can log daily sales
    manage_applications: true, // Staff can register certificates
    manage_accounts: false,
    manage_customers: true,
    manage_inventory: true, // Staff can sell accessories or stationery
    manage_payroll: false,
    manage_settings: false
  }
};

// Seed credentials (Owner account remains for default entry, others removed)
const PRESET_USERS = [
  { username: 'SHIBURCN', name: 'Shibu (Owner)', role: 'owner', password: 'John@392091' }
];

class AuthService {
  constructor() {
    this.currentUser = this.loadCurrentUser();
    this.privileges = this.loadPrivileges();
    this.users = this.loadUsers();
    this.listeners = [];
  }

  reloadUsers() {
    this.users = this.loadUsers();
  }

  onStateChange(listener) {
    this.listeners.push(listener);
  }

  triggerStateChange() {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (e) {
        console.error('Error in auth state change listener:', e);
      }
    });
  }

  loadCurrentUser() {
    const user = localStorage.getItem('cyberone_v2_current_user');
    return user ? JSON.parse(user) : null;
  }

  loadPrivileges() {
    const privs = localStorage.getItem('cyberone_v2_privileges');
    return privs ? JSON.parse(privs) : DEFAULT_PRIVILEGES;
  }

  loadUsers() {
    const users = localStorage.getItem('cyberone_v2_users');
    let usersList = [];
    if (!users) {
      usersList = [...PRESET_USERS];
      localStorage.setItem('cyberone_v2_users', JSON.stringify(usersList));
    } else {
      usersList = JSON.parse(users);
      // Ensure the default owner exists and is exactly SHIBURCN with John@392091
      // Remove any other owner-role users to make sure SHIBURCN is the ONLY owner
      usersList = usersList.filter(u => u.role !== 'owner' || u.username.toUpperCase() === 'SHIBURCN');
      
      let ownerUser = usersList.find(u => u.username.toUpperCase() === 'SHIBURCN');
      if (!ownerUser) {
        ownerUser = { username: 'SHIBURCN', name: 'Shibu (Owner)', role: 'owner', password: 'John@392091' };
        usersList.unshift(ownerUser);
      } else {
        // Enforce correct password and name/role
        ownerUser.username = 'SHIBURCN';
        ownerUser.password = 'John@392091';
        ownerUser.name = 'Shibu (Owner)';
        ownerUser.role = 'owner';
      }
      localStorage.setItem('cyberone_v2_users', JSON.stringify(usersList));
    }
    return usersList;
  }

  login(username, password) {
    const user = this.users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    
    if (user) {
      this.currentUser = {
        name: user.name,
        username: user.username,
        role: user.role,
        photo: user.photo || ''
      };
      localStorage.setItem('cyberone_v2_current_user', JSON.stringify(this.currentUser));
      return { success: true, user: this.currentUser };
    }
    return { success: false, message: 'Invalid username or password' };
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('cyberone_v2_current_user');
    return true;
  }

  // Check if active user has permission for a specific feature action
  hasPermission(privilegeName) {
    if (!this.currentUser) return false;
    const role = this.currentUser.role;
    return !!(this.privileges[role] && this.privileges[role][privilegeName]);
  }

  updatePrivilege(role, privilegeName, value) {
    if (!this.privileges[role]) return false;
    
    // Protect Owner from lockouts
    if (role === 'owner') return false;

    this.privileges[role][privilegeName] = !!value;
    localStorage.setItem('cyberone_v2_privileges', JSON.stringify(this.privileges));
    this.triggerStateChange();
    return true;
  }

  getPrivilegesForRole(role) {
    return this.privileges[role] || null;
  }

  getPresetUsers() {
    return this.users;
  }

  addUser(name, username, password, role, mobile = '', email = '', photo = '', baseSalary = null) {
    if (role === 'owner') return { success: false, message: 'Cannot create another owner' };
    const exists = this.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) return { success: false, message: 'Username already exists' };

    const newUser = { name, username, password, role, mobile, email, photo, baseSalary: baseSalary !== null ? parseFloat(baseSalary) : null };
    this.users.push(newUser);
    localStorage.setItem('cyberone_v2_users', JSON.stringify(this.users));
    this.triggerStateChange();
    return { success: true, user: newUser };
  }

  updateUser(username, updatedData) {
    const idx = this.users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (idx === -1) return { success: false, message: 'User not found' };

    // Prevent changing role to owner for non-owners, or changing role from owner for default owner
    if (updatedData.role === 'owner' && username.toUpperCase() !== 'SHIBURCN') {
      return { success: false, message: 'Cannot set role to owner' };
    }
    if (username.toUpperCase() === 'SHIBURCN' && updatedData.role && updatedData.role !== 'owner') {
      return { success: false, message: 'Cannot change owner role' };
    }

    // Update fields
    this.users[idx] = {
      ...this.users[idx],
      ...updatedData
    };
    
    localStorage.setItem('cyberone_v2_users', JSON.stringify(this.users));

    // If the updated user is the currently logged-in user, update the active session!
    if (this.currentUser && this.currentUser.username.toLowerCase() === username.toLowerCase()) {
      this.currentUser.name = this.users[idx].name;
      this.currentUser.role = this.users[idx].role;
      this.currentUser.photo = this.users[idx].photo || '';
      localStorage.setItem('cyberone_v2_current_user', JSON.stringify(this.currentUser));
    }

    this.triggerStateChange();
    return { success: true, user: this.users[idx] };
  }

  deleteUser(username) {
    if (username.toUpperCase() === 'SHIBURCN') return { success: false, message: 'Cannot delete Owner account' };
    
    const index = this.users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (index === -1) return { success: false, message: 'User not found' };

    this.users.splice(index, 1);
    localStorage.setItem('cyberone_v2_users', JSON.stringify(this.users));
    this.triggerStateChange();
    return { success: true };
  }
}

export const auth = new AuthService();
export default auth;
