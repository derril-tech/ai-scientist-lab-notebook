-- Create datasets table
CREATE TABLE IF NOT EXISTS datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_type VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    s3_key VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    schema JSONB,
    row_count INTEGER DEFAULT 0,
    column_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    metadata JSONB,
    workspace_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_datasets_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT fk_datasets_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_datasets_workspace_id ON datasets(workspace_id);
CREATE INDEX idx_datasets_status ON datasets(status);
CREATE INDEX idx_datasets_created_at ON datasets(created_at);
CREATE INDEX idx_datasets_file_type ON datasets(file_type);

-- Enable Row Level Security
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view datasets in their workspaces" ON datasets
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    );

CREATE POLICY "Users can create datasets in their workspaces" ON datasets
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    );

CREATE POLICY "Users can update datasets in their workspaces" ON datasets
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    );

CREATE POLICY "Users can delete datasets in their workspaces" ON datasets
    FOR DELETE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Create update trigger
CREATE OR REPLACE FUNCTION update_datasets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_datasets_updated_at
    BEFORE UPDATE ON datasets
    FOR EACH ROW
    EXECUTE FUNCTION update_datasets_updated_at();
