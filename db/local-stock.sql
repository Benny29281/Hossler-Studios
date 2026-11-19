WITH restock AS (
  INSERT INTO settings (key, value)
  VALUES ('local_demo_stock_v1', 'true'::jsonb)
  ON CONFLICT (key) DO NOTHING
  RETURNING key
)
UPDATE variants
SET stock = greatest(stock, 10)
WHERE product_slug = 'ace-of-hearts-tee'
  AND size IN ('S', 'M', 'L', 'XL')
  AND active
  AND EXISTS (SELECT 1 FROM restock);
