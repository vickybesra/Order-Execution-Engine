-- Order Execution Engine Database Schema

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255) UNIQUE NOT NULL,
  token_in VARCHAR(50) NOT NULL,
  token_out VARCHAR(50) NOT NULL,
  amount NUMERIC(20, 8) NOT NULL,
  order_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  submitted_at TIMESTAMP NOT NULL,
  executed_at TIMESTAMP,
  failed_at TIMESTAMP,
  failure_reason TEXT,
  exchange_id VARCHAR(50),
  execution_price NUMERIC(20, 8),
  execution_amount NUMERIC(20, 8),
  routing_decision JSONB,
  tx_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_submitted_at ON orders(submitted_at);
CREATE INDEX IF NOT EXISTS idx_orders_tx_hash ON orders(tx_hash);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

