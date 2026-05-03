import { supabase } from '@/lib/supabase';

// Check if we're in demo mode (no real Supabase configured)
const isDemoMode = !import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL.includes('your-project');

// Demo data storage using localStorage
const STORAGE_PREFIX = 'wasla_demo_';

function getDemoData(key) {
  const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
}

function setDemoData(key, data) {
  localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Initialize demo data if empty
function initDemoData() {
  if (getDemoData('clients').length === 0) {
    const clients = [
      {
        id: generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        name: 'Ahmed Al-Rashid',
        email: 'ahmed@example.com',
        phone: '+968 9123 4567',
        company: 'Al-Rashid Properties',
        address: 'Muscat, Oman',
      },
      {
        id: generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        name: 'Fatima Al-Balushi',
        email: 'fatima@example.com',
        phone: '+968 9234 5678',
        company: 'Balushi Real Estate',
        address: 'Salalah, Oman',
      },
    ];
    setDemoData('clients', clients);

    const properties = [
      {
        id: generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        client_id: clients[0].id,
        name: 'Seaside Villa',
        address: '123 Beach Road, Muscat',
        type: 'Villa',
        bedrooms: 4,
        bathrooms: 3,
        area_sqft: 3500,
      },
      {
        id: generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        client_id: clients[1].id,
        name: 'Downtown Apartment',
        address: '456 City Center, Muscat',
        type: 'Apartment',
        bedrooms: 2,
        bathrooms: 2,
        area_sqft: 1200,
      },
    ];
    setDemoData('properties', properties);

    const inspections = [
      {
        id: generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        property_id: properties[0].id,
        client_id: clients[0].id,
        inspector_name: 'Mohammed Al-Siyabi',
        inspection_date: new Date().toISOString().split('T')[0],
        type: 'Move-in',
        status: 'completed',
        areas: [],
        notes: 'Property in excellent condition',
      },
    ];
    setDemoData('inspections', inspections);

    const invoices = [
      {
        id: generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        client_id: clients[0].id,
        inspection_id: inspections[0].id,
        invoice_number: 'INV-001',
        amount: 150.000,
        currency: 'OMR',
        status: 'paid',
        items: [{ description: 'Property Inspection', quantity: 1, unit_price: 150, total: 150 }],
      },
    ];
    setDemoData('invoices', invoices);
  }
}

// Initialize demo data on load
if (isDemoMode) {
  console.log('Running in DEMO MODE - data stored in localStorage');
  initDemoData();
}

// Demo mode entity handler
function createDemoEntityHandler(tableName) {
  return {
    async list() {
      return getDemoData(tableName);
    },

    async filter(queryObj) {
      const data = getDemoData(tableName);
      return data.filter(item => {
        return Object.entries(queryObj).every(([key, value]) => {
          return item[key] === value;
        });
      });
    },

    async get(id) {
      const data = getDemoData(tableName);
      return data.find(item => item.id === id) || null;
    },

    async create(newData) {
      const data = getDemoData(tableName);
      const item = {
        ...newData,
        id: generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      data.push(item);
      setDemoData(tableName, data);
      return item;
    },

    async update(id, updateData) {
      const data = getDemoData(tableName);
      const index = data.findIndex(item => item.id === id);
      if (index === -1) throw new Error('Not found');
      data[index] = { ...data[index], ...updateData, updated_at: new Date().toISOString() };
      setDemoData(tableName, data);
      return data[index];
    },

    async delete(id) {
      const data = getDemoData(tableName);
      const filtered = data.filter(item => item.id !== id);
      setDemoData(tableName, filtered);
    },

    async deleteMany(queryObj) {
      const data = getDemoData(tableName);
      const filtered = data.filter(item => {
        return !Object.entries(queryObj).every(([key, value]) => {
          return item[key] === value;
        });
      });
      setDemoData(tableName, filtered);
    },

    async bulkCreate(items) {
      const data = getDemoData(tableName);
      const created = items.map(item => ({
        ...item,
        id: generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      data.push(...created);
      setDemoData(tableName, data);
      return created;
    },
  };
}

// Helper to get current user ID
async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Failed to get current user:', error.message);
    throw new Error(`Authentication error: ${error.message}`);
  }

  return data?.user?.id || null;
}

// Supabase entity handler (production)
function createSupabaseEntityHandler(tableName) {
  return {
    async list(sort, limit, skip, fields) {
      let query = supabase.from(tableName).select(fields?.join(',') || '*');

      if (sort) {
        const isDesc = sort.startsWith('-');
        const column = isDesc ? sort.slice(1) : sort;
        query = query.order(column, { ascending: !isDesc });
      }

      if (limit) {
        query = query.limit(limit);
      }

      if (skip) {
        query = query.range(skip, skip + (limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Failed to list ${tableName}:`, error.message);
        throw new Error(`Failed to list ${tableName}: ${error.message}`);
      }

      return data || [];
    },

    async filter(queryObj, sort, limit, skip, fields) {
      let query = supabase.from(tableName).select(fields?.join(',') || '*');

      Object.entries(queryObj).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && value !== null) {
            const operators = value;
            Object.entries(operators).forEach(([op, val]) => {
              switch (op) {
                case '$eq':
                  query = query.eq(key, val);
                  break;
                case '$ne':
                  query = query.neq(key, val);
                  break;
                case '$gt':
                  query = query.gt(key, val);
                  break;
                case '$gte':
                  query = query.gte(key, val);
                  break;
                case '$lt':
                  query = query.lt(key, val);
                  break;
                case '$lte':
                  query = query.lte(key, val);
                  break;
                case '$in':
                  query = query.in(key, val);
                  break;
                case '$like':
                  query = query.ilike(key, `%${val}%`);
                  break;
              }
            });
          } else {
            query = query.eq(key, value);
          }
        }
      });

      if (sort) {
        const isDesc = sort.startsWith('-');
        const column = isDesc ? sort.slice(1) : sort;
        query = query.order(column, { ascending: !isDesc });
      }

      if (limit) {
        query = query.limit(limit);
      }

      if (skip) {
        query = query.range(skip, skip + (limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Failed to filter ${tableName}:`, error.message);
        throw new Error(`Failed to filter ${tableName}: ${error.message}`);
      }

      return data || [];
    },

    async get(id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error(`Failed to get ${tableName}:`, error.message);
        throw new Error(`Failed to get ${tableName}: ${error.message}`);
      }

      return data;
    },

    async create(data) {
      // Automatically add user_id for RLS
      const userId = await getCurrentUserId();
      const dataWithUser = userId ? { ...data, user_id: userId } : data;

      const { data: created, error } = await supabase
        .from(tableName)
        .insert(dataWithUser)
        .select()
        .single();

      if (error) {
        console.error(`Failed to create ${tableName}:`, error.message);
        throw new Error(`Failed to create ${tableName}: ${error.message}`);
      }

      return created;
    },

    async update(id, updateData) {
      const { data, error } = await supabase
        .from(tableName)
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Failed to update ${tableName}:`, error.message);
        throw new Error(`Failed to update ${tableName}: ${error.message}`);
      }

      return data;
    },

    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Failed to delete ${tableName}:`, error.message);
        throw new Error(`Failed to delete ${tableName}: ${error.message}`);
      }
    },

    async deleteMany(queryObj) {
      let query = supabase.from(tableName).delete();

      Object.entries(queryObj).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { error } = await query;

      if (error) {
        console.error(`Failed to delete many ${tableName}:`, error.message);
        throw new Error(`Failed to delete many ${tableName}: ${error.message}`);
      }
    },

    async bulkCreate(items) {
      // Automatically add user_id for RLS
      const userId = await getCurrentUserId();
      const itemsWithUser = userId
        ? items.map(item => ({ ...item, user_id: userId }))
        : items;

      const { data, error } = await supabase
        .from(tableName)
        .insert(itemsWithUser)
        .select();

      if (error) {
        console.error(`Failed to bulk create ${tableName}:`, error.message);
        throw new Error(`Failed to bulk create ${tableName}: ${error.message}`);
      }

      return data || [];
    },
  };
}

// Factory function that returns the appropriate handler
function createEntityHandler(tableName) {
  if (isDemoMode) {
    return createDemoEntityHandler(tableName);
  }
  return createSupabaseEntityHandler(tableName);
}

// Entity instances
export const Client = createEntityHandler('clients');
export const Property = createEntityHandler('properties');
export const Inspection = createEntityHandler('inspections');
export const Invoice = createEntityHandler('invoices');

// Demo user for demo mode
const demoUser = {
  id: 'demo-user',
  email: 'demo@wasla.app',
  full_name: 'Demo User',
  role: 'admin',
  darkMode: false,
  theme: 'light',
};

// Auth / User module
export const User = {
  async me() {
    if (isDemoMode) {
      return demoUser;
    }

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email || '',
      full_name: profile?.full_name || user.user_metadata?.full_name,
      avatar: profile?.avatar || user.user_metadata?.avatar_url,
      role: profile?.role || 'user',
      phone: profile?.phone || '',
      company: profile?.company || '',
      address: profile?.address || '',
      darkMode: profile?.dark_mode ?? false,
      theme: profile?.theme || 'light',
      notifications: profile?.notifications ?? true,
      emailReminders: profile?.email_reminders ?? true,
    };
  },

  async updateMe(data) {
    if (isDemoMode) {
      Object.assign(demoUser, data);
      return demoUser;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const updatePayload = {
      id: user.id,
      updated_at: new Date().toISOString(),
    };
    if (data.full_name !== undefined) updatePayload.full_name = data.full_name;
    if (data.avatar !== undefined) updatePayload.avatar = data.avatar;
    if (data.phone !== undefined) updatePayload.phone = data.phone;
    if (data.company !== undefined) updatePayload.company = data.company;
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.darkMode !== undefined) updatePayload.dark_mode = data.darkMode;
    if (data.theme !== undefined) updatePayload.theme = data.theme;
    if (data.notifications !== undefined) updatePayload.notifications = data.notifications;
    if (data.emailReminders !== undefined) updatePayload.email_reminders = data.emailReminders;

    const { data: updated, error } = await supabase
      .from('profiles')
      .upsert(updatePayload)
      .select()
      .single();

    if (error) {
      console.error('Failed to update profile:', error.message);
      throw new Error(error.message || 'Failed to update profile');
    }

    return {
      id: user.id,
      email: user.email || '',
      full_name: updated?.full_name,
      avatar: updated?.avatar,
      role: updated?.role,
      phone: updated?.phone || '',
      company: updated?.company || '',
      address: updated?.address || '',
      darkMode: updated?.dark_mode,
      theme: updated?.theme,
      notifications: updated?.notifications ?? true,
      emailReminders: updated?.email_reminders ?? true,
    };
  },

  async login(email, password) {
    if (isDemoMode) {
      return demoUser;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      return this.me();
    }

    return null;
  },

  async signUp(email, password, metadata) {
    if (isDemoMode) {
      return demoUser;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      return this.me();
    }

    return null;
  },

};

