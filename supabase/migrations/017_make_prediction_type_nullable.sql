-- Make prediction_type nullable in vip_winnings table
ALTER TABLE vip_winnings 
ALTER COLUMN prediction_type DROP NOT NULL;

