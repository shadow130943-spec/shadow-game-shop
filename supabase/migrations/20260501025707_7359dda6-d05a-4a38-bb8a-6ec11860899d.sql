ALTER TABLE public.game_orders ALTER COLUMN product_item_id DROP NOT NULL;
ALTER TABLE public.game_orders ALTER COLUMN product_id DROP NOT NULL;

UPDATE public.game_orders
SET product_item_id = NULL, product_id = NULL
WHERE product_id IN (
  'e7466b5c-39dc-41fa-9fc2-f59096103018',
  '9e802d85-fce7-406f-83ad-400cc74ab150'
);

DELETE FROM public.product_items WHERE product_id IN (
  'e7466b5c-39dc-41fa-9fc2-f59096103018',
  '9e802d85-fce7-406f-83ad-400cc74ab150'
);
DELETE FROM public.products WHERE id IN (
  'e7466b5c-39dc-41fa-9fc2-f59096103018',
  '9e802d85-fce7-406f-83ad-400cc74ab150'
);

DROP TABLE IF EXISTS public.digital_orders CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;