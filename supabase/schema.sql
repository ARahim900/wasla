-- Wasla Property Solutions Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar TEXT,
    role TEXT DEFAULT 'user',
    dark_mode BOOLEAN DEFAULT false,
    theme TEXT DEFAULT 'light',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    type TEXT,
    bedrooms INTEGER,
    bathrooms INTEGER,
    area_sqft NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspections table
CREATE TABLE IF NOT EXISTS inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    inspector_name TEXT,
    inspection_date DATE NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    areas JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    photos TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    amount NUMERIC(10, 3) NOT NULL,
    currency TEXT DEFAULT 'OMR',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    due_date DATE,
    paid_date DATE,
    items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_properties_client_id ON properties(client_id);
CREATE INDEX IF NOT EXISTS idx_inspections_property_id ON inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_inspections_client_id ON inspections(client_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your auth requirements)

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- For other tables, allow authenticated users full access
-- You may want to restrict this based on your business requirements

CREATE POLICY "Authenticated users can read clients" ON clients
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert clients" ON clients
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients" ON clients
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete clients" ON clients
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read properties" ON properties
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert properties" ON properties
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update properties" ON properties
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete properties" ON properties
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read inspections" ON inspections
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert inspections" ON inspections
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update inspections" ON inspections
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete inspections" ON inspections
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read invoices" ON invoices
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert invoices" ON invoices
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices" ON invoices
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete invoices" ON invoices
    FOR DELETE TO authenticated USING (true);

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name, avatar)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Storage bucket for uploads (run this in SQL editor)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-photos', 'inspection-photos', true);
