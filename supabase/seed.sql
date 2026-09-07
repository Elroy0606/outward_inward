-- Optional demo data. Run after the migrations in supabase/migrations/ if you want a
-- populated dashboard to develop against. Safe to skip in production.

insert into public.shipments
  (type, status, company_name, cost_center_oca, shipment_date, invoice_number,
   particulars, shipping_address, taken_out_by, transporter_name, tracking_number,
   delivery_date, confirmed_with, shipping_charges, weight_kg, volume_cbm,
   contact_person, contact_number, email, remarks)
values
  ('INWARD', 'DELIVERED', 'Acme Components Pvt Ltd', 'CC-101 / OCA-2201', '2026-08-12',
   'INV-8821', 'Precision bearings, 200 units', 'Plant 2, MIDC Industrial Area, Pune',
   'Rakesh Sharma', 'BlueDart Logistics', 'BD778812234', '2026-08-15', 'Priya (Stores)',
   1450.00, 84.500, 0.62, 'Priya Nair', '+91 98200 11223', 'priya.nair@acmecomponents.example',
   'Received in good condition.'),
  ('INWARD', 'IN_TRANSIT', 'Nova Alloys Ltd', 'CC-101 / OCA-2202', '2026-08-28', 'INV-9014',
   'Aluminium sheet stock, 40 sheets', 'Plant 1, Chakan, Pune', null, 'VRL Transport',
   'VRL556432', null, null, 3200.00, 620.000, 1.85, 'Anil Kulkarni', '+91 99870 44556',
   'anil.k@novaalloys.example', 'Awaiting delivery confirmation from transporter.'),
  ('INWARD', 'PENDING', 'Sunrise Packaging Co', 'CC-104', '2026-09-01', null,
   'Corrugated boxes, 5000 pcs', 'Warehouse 3, Bhosari', null, null, null, null, null,
   null, null, null, 'Meena Joshi', '+91 90210 33221', 'meena@sunrisepack.example',
   'PO raised, awaiting dispatch.'),
  ('OUTWARD', 'DELIVERED', 'Meridian Retail Group', 'CC-210', '2026-08-05', 'INV-EX-441',
   'Finished goods — batch #4471', '12 Commerce Street, Mumbai', 'Sanjay Patil', 'DTDC',
   'DTDC33210091', '2026-08-08', 'Rahul (Warehouse Mgr)', 980.00, 145.200, 0.44,
   'Rahul Verma', '+91 98765 11009', 'rahul.verma@meridianretail.example',
   'Signed proof of delivery on file.'),
  ('OUTWARD', 'IN_TRANSIT', 'Global Exports Inc', 'CC-210', '2026-08-30', 'INV-EX-455',
   'Export crate — machine parts', 'Nhava Sheva Port, Mumbai', 'Sanjay Patil', 'FedEx Freight',
   'FX99213345', null, null, 5400.00, 310.000, 2.10, 'Karen Liu', '+1 415 555 0192',
   'karen.liu@globalexports.example', 'Customs clearance in progress.'),
  ('OUTWARD', 'CANCELLED', 'Northside Distributors', 'CC-212', '2026-08-20', 'INV-EX-448',
   'Replacement parts order', 'Warehouse 7, Nagpur', null, null, null, null, null,
   null, null, null, 'Deepak Rao', '+91 93700 22110', 'deepak.rao@northside.example',
   'Order cancelled by customer before dispatch.'),
  ('OUTWARD', 'PENDING', 'Bluewave Traders', 'CC-215', '2026-09-03', null,
   'Sample shipment — 3 cartons', 'Andheri East, Mumbai', null, null, null, null, null,
   null, null, null, 'Farah Sheikh', '+91 91234 55667', 'farah@bluewavetraders.example',
   'Awaiting packing list from sales team.');
