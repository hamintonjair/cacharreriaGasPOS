--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: red_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO red_user;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: red_user
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Category; Type: TABLE; Schema: public; Owner: red_user
--

CREATE TABLE public."Category" (
    id integer NOT NULL,
    nombre text NOT NULL
);


ALTER TABLE public."Category" OWNER TO red_user;

--
-- Name: Category_id_seq; Type: SEQUENCE; Schema: public; Owner: red_user
--

CREATE SEQUENCE public."Category_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Category_id_seq" OWNER TO red_user;

--
-- Name: Category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: red_user
--

ALTER SEQUENCE public."Category_id_seq" OWNED BY public."Category".id;


--
-- Name: GasType; Type: TABLE; Schema: public; Owner: red_user
--

CREATE TABLE public."GasType" (
    id integer NOT NULL,
    nombre text NOT NULL,
    stock_llenos integer DEFAULT 0 NOT NULL,
    stock_vacios integer DEFAULT 0 NOT NULL,
    precio_venta numeric(10,2) NOT NULL,
    precio_envase numeric(10,2) NOT NULL
);


ALTER TABLE public."GasType" OWNER TO red_user;

--
-- Name: GasType_id_seq; Type: SEQUENCE; Schema: public; Owner: red_user
--

CREATE SEQUENCE public."GasType_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."GasType_id_seq" OWNER TO red_user;

--
-- Name: GasType_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: red_user
--

ALTER SEQUENCE public."GasType_id_seq" OWNED BY public."GasType".id;


--
-- Name: Product; Type: TABLE; Schema: public; Owner: red_user
--

CREATE TABLE public."Product" (
    id integer NOT NULL,
    nombre text NOT NULL,
    codigo_barras text,
    precio_venta numeric(10,2) NOT NULL,
    costo numeric(10,2) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    stock_minimo integer DEFAULT 5 NOT NULL,
    "categoryId" integer NOT NULL
);


ALTER TABLE public."Product" OWNER TO red_user;

--
-- Name: Product_id_seq; Type: SEQUENCE; Schema: public; Owner: red_user
--

CREATE SEQUENCE public."Product_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Product_id_seq" OWNER TO red_user;

--
-- Name: Product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: red_user
--

ALTER SEQUENCE public."Product_id_seq" OWNED BY public."Product".id;


--
-- Name: Sale; Type: TABLE; Schema: public; Owner: red_user
--

CREATE TABLE public."Sale" (
    id integer NOT NULL,
    fecha timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    total numeric(10,2) NOT NULL,
    metodo_pago text NOT NULL,
    "userId" integer NOT NULL,
    "clientId" integer
);


ALTER TABLE public."Sale" OWNER TO red_user;

--
-- Name: SaleItem; Type: TABLE; Schema: public; Owner: red_user
--

CREATE TABLE public."SaleItem" (
    id integer NOT NULL,
    "saleId" integer NOT NULL,
    "productId" integer,
    "gasTypeId" integer,
    cantidad integer NOT NULL,
    precio_unit numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    recibio_envase boolean DEFAULT false NOT NULL
);


ALTER TABLE public."SaleItem" OWNER TO red_user;

--
-- Name: SaleItem_id_seq; Type: SEQUENCE; Schema: public; Owner: red_user
--

CREATE SEQUENCE public."SaleItem_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."SaleItem_id_seq" OWNER TO red_user;

--
-- Name: SaleItem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: red_user
--

ALTER SEQUENCE public."SaleItem_id_seq" OWNED BY public."SaleItem".id;


--
-- Name: Sale_id_seq; Type: SEQUENCE; Schema: public; Owner: red_user
--

CREATE SEQUENCE public."Sale_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Sale_id_seq" OWNER TO red_user;

--
-- Name: Sale_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: red_user
--

ALTER SEQUENCE public."Sale_id_seq" OWNED BY public."Sale".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: red_user
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO red_user;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: red_user
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    nombre text NOT NULL,
    identificacion text,
    telefono text,
    direccion text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.clients OWNER TO red_user;

--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: red_user
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_id_seq OWNER TO red_user;

--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: red_user
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: red_user
--

CREATE TABLE public.companies (
    id integer DEFAULT 1 NOT NULL,
    name text NOT NULL,
    tax_id text NOT NULL,
    address text NOT NULL,
    phone text NOT NULL,
    email text,
    logo_url text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.companies OWNER TO red_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: red_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    nombre text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    role text DEFAULT 'VENDEDOR'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO red_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: red_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO red_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: red_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: Category id; Type: DEFAULT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public."Category" ALTER COLUMN id SET DEFAULT nextval('public."Category_id_seq"'::regclass);


--
-- Name: GasType id; Type: DEFAULT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public."GasType" ALTER COLUMN id SET DEFAULT nextval('public."GasType_id_seq"'::regclass);


--
-- Name: Product id; Type: DEFAULT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public."Product" ALTER COLUMN id SET DEFAULT nextval('public."Product_id_seq"'::regclass);


--
-- Name: Sale id; Type: DEFAULT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public."Sale" ALTER COLUMN id SET DEFAULT nextval('public."Sale_id_seq"'::regclass);


--
-- Name: SaleItem id; Type: DEFAULT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public."SaleItem" ALTER COLUMN id SET DEFAULT nextval('public."SaleItem_id_seq"'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public."Category" (id, nombre) FROM stdin;
1	Cacharrería General
4	Barillas
2	Cementos
\.


--
-- Data for Name: GasType; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public."GasType" (id, nombre, stock_llenos, stock_vacios, precio_venta, precio_envase) FROM stdin;
2	Cilindo 100lb	7	2	320000.00	400000.00
1	Cilindro 10lb	7	8	45000.00	120000.00
3	Cilindro 40lb	9	2	150000.00	250000.00
6	Cilindro 100lb	8	2	320000.00	400000.00
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public."Product" (id, nombre, codigo_barras, precio_venta, costo, stock, stock_minimo, "categoryId") FROM stdin;
6	Trapeador	770000000004	14000.00	9000.00	15	3	1
1	Cemento blanco	7000001	35000.00	30000.00	48	5	4
10	Tornillos driwal	770000003	100.00	50.00	1	5	1
21	Pintura Blanca 1G	770100000100	25000.00	15000.00	30	5	1
24	Silicona Selladora	770100000103	18000.00	10000.00	25	3	1
27	Barilla 1/2 Pulgada	880100000201	8000.00	5000.00	150	30	2
41	Linterna LED Recargable	770100000107	25000.00	15000.00	40	5	1
43	Cinta Métrica 5m	770100000109	10000.00	6000.00	60	10	1
45	Varilla Corrugada 1/4	880100000204	4000.00	2500.00	300	60	4
39	Taladro Percutor 500W	770100000105	150000.00	95000.00	9	2	1
2	Barilla de 2pulgadas	7000002	15000.00	10000.00	98	5	1
5	Escoba	770000000003	12000.00	8000.00	19	3	2
47	Mortero Seco 25kg	990100000302	18000.00	11000.00	44	5	1
3	Detergente 1L	770000000001	8500.00	6000.00	28	5	1
26	Barilla 3/8 Pulgada	880100000200	5000.00	3000.00	199	50	2
7	Ambientador	770000000005	7000.00	4500.00	39	5	1
22	Brocha de 4 pulgadas	770100000101	8000.00	4500.00	47	10	1
40	Sierra Caladora	770100000106	120000.00	75000.00	2	2	1
46	Grapa para Malla	880100000205	1000.00	500.00	499	100	2
8	Limpieza	770000000006	7000.00	4500.00	39	5	1
44	Malla Electrosoldada	880100000203	45000.00	30000.00	14	3	2
48	Aditivo Impermeabilizante	990100000303	30000.00	18000.00	19	3	1
4	Jabón en barra	770000000002	2500.00	1500.00	97	10	1
28	Alambre de Amarre	880100000202	15000.00	9000.00	99	20	2
42	Destornillador Phillips	770100000108	5000.00	2500.00	79	15	1
25	Candado de Alta Seguridad	770100000104	35000.00	20000.00	13	2	1
23	Guantes de Seguridad	770100000102	12000.00	7000.00	44	5	1
\.


--
-- Data for Name: Sale; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public."Sale" (id, fecha, total, metodo_pago, "userId", "clientId") FROM stdin;
1	2025-11-23 17:33:19.193	45000.00	Efectivo	1	\N
2	2025-11-23 17:42:33.384	115000.00	Efectivo	1	\N
3	2025-11-23 17:43:25.689	720000.00	Efectivo	1	\N
4	2025-11-23 17:43:48.697	400000.00	Efectivo	1	\N
5	2025-11-23 17:45:16.737	135000.00	Efectivo	1	\N
6	2025-11-23 17:45:47.739	640000.00	Efectivo	1	\N
7	2025-11-23 17:46:12.41	150000.00	Efectivo	1	\N
8	2025-11-23 19:21:26.658	60000.00	Efectivo	1	2
9	2025-11-23 19:33:13.939	47500.00	Transferencia	1	1
10	2025-11-23 20:59:52.542	500.00	Efectivo	1	1
11	2025-11-23 21:36:43.766	210000.00	Transferencia	1	1
12	2025-11-23 21:59:14.9	35000.00	Efectivo	1	1
13	2025-11-23 22:00:05.345	12000.00	Efectivo	1	1
14	2025-11-23 22:01:34.255	8500.00	Efectivo	1	1
15	2025-11-23 22:03:07.42	18000.00	Efectivo	1	1
16	2025-11-23 22:42:54.946	8500.00	Efectivo	1	1
17	2025-11-23 22:46:07.107	13000.00	Efectivo	1	2
18	2025-11-23 22:46:45.49	7000.00	Efectivo	1	2
19	2025-11-23 22:51:25.957	8000.00	Efectivo	1	1
20	2025-11-23 22:56:26.65	8000.00	Efectivo	1	1
21	2025-11-23 23:14:58.254	800000.00	Transferencia	1	1
22	2025-11-23 23:15:53.458	390000.00	Transferencia	1	1
26	2025-11-23 21:36:23.033	45000.00	Transferencia	1	1
23	2025-11-23 02:27:00.01	321000.00	Efectivo	2	1
24	2025-11-23 02:29:23.496	7000.00	Efectivo	1	1
25	2025-11-23 02:33:53.438	2500.00	Transferencia	1	1
27	2025-11-23 21:49:47.147	30000.00	Transferencia	1	1
28	2025-11-24 03:00:42.472	2500.00	Transferencia	1	1
29	2025-11-24 03:03:02.587	67000.00	Transferencia	2	2
\.


--
-- Data for Name: SaleItem; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public."SaleItem" (id, "saleId", "productId", "gasTypeId", cantidad, precio_unit, subtotal, recibio_envase) FROM stdin;
1	1	\N	1	1	45000.00	45000.00	t
2	2	1	\N	2	35000.00	70000.00	f
3	2	\N	1	1	45000.00	45000.00	t
4	3	\N	2	1	720000.00	720000.00	f
5	4	\N	3	1	400000.00	400000.00	f
6	5	\N	1	3	45000.00	135000.00	t
7	6	\N	2	2	320000.00	640000.00	t
8	7	\N	3	1	150000.00	150000.00	t
9	8	2	\N	1	15000.00	15000.00	f
10	8	\N	1	1	45000.00	45000.00	t
11	9	4	\N	1	2500.00	2500.00	f
12	9	\N	1	1	45000.00	45000.00	t
13	10	10	\N	5	100.00	500.00	f
14	11	39	\N	1	150000.00	150000.00	f
15	11	\N	1	1	45000.00	45000.00	t
16	11	2	\N	1	15000.00	15000.00	f
17	12	25	\N	1	35000.00	35000.00	f
18	13	5	\N	1	12000.00	12000.00	f
19	14	3	\N	1	8500.00	8500.00	f
20	15	47	\N	1	18000.00	18000.00	f
21	16	3	\N	1	8500.00	8500.00	f
22	17	22	\N	1	8000.00	8000.00	f
23	17	26	\N	1	5000.00	5000.00	f
24	18	7	\N	1	7000.00	7000.00	f
25	19	22	\N	1	8000.00	8000.00	f
26	20	22	\N	1	8000.00	8000.00	f
27	21	40	\N	4	120000.00	480000.00	f
28	21	\N	6	1	320000.00	320000.00	t
29	22	40	\N	2	120000.00	240000.00	f
30	22	\N	3	1	150000.00	150000.00	t
31	23	46	\N	1	1000.00	1000.00	f
32	23	\N	6	1	320000.00	320000.00	t
33	24	8	\N	1	7000.00	7000.00	f
34	25	4	\N	1	2500.00	2500.00	f
35	26	44	\N	1	45000.00	45000.00	f
36	27	48	\N	1	30000.00	30000.00	f
37	28	4	\N	1	2500.00	2500.00	f
38	29	28	\N	1	15000.00	15000.00	f
39	29	42	\N	1	5000.00	5000.00	f
40	29	25	\N	1	35000.00	35000.00	f
41	29	23	\N	1	12000.00	12000.00	f
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public.clients (id, nombre, identificacion, telefono, direccion, created_at, updated_at) FROM stdin;
1	Cliente Genérico	999999999	5555555	Quibdó - Chocó	2025-11-23 18:45:32.548	2025-11-23 18:55:28.61
2	Duvan Mateo Asprilla Huurtado	10798093451	7777777	Cra 11 # 146 - 36 barrio buenos aires	2025-11-23 18:56:27.136	2025-11-24 02:26:14.563
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public.companies (id, name, tax_id, address, phone, email, logo_url, created_at, updated_at) FROM stdin;
1	Jojama	80772379-1	Cra 11 # 146 - 36 Barrio buenos aires Quibdó - Chocó	0000000000	empresa@ejemplo.com	/uploads/logos/logo-1763937625750-846003767.jpg	2025-11-23 22:18:11.101	2025-11-23 22:41:32.867
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public.users (id, nombre, username, password, role, created_at, updated_at) FROM stdin;
1	Administrador	admin	$2a$10$0jm7Asywux5V6S.Elq6wquE8RdY7sQylhdx.6NiHpjtZHaULCf1YW	ADMIN	2025-11-23 17:19:27.762	2025-11-23 17:49:57.632
2	Haminton Jair Mena	jair	$2a$10$tk6NMoLBt6jtC8qVMDefUeBNl7ZwX.G5rCPI1JVzOWRpmcgf4lqFG	VENDEDOR	2025-11-23 17:50:07.139	2025-11-23 17:50:07.139
\.


--
-- Name: Category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public."Category_id_seq"', 4, true);


--
-- Name: GasType_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public."GasType_id_seq"', 6, true);


--
-- Name: Product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public."Product_id_seq"', 48, true);


--
-- Name: SaleItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public."SaleItem_id_seq"', 41, true);


--
-- Name: Sale_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public."Sale_id_seq"', 29, true);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public.clients_id_seq', 4, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: GasType GasType_pkey; Type: CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public."GasType"
    ADD CONSTRAINT "GasType_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: SaleItem SaleItem_pkey; Type: CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_pkey" PRIMARY KEY (id);


--
-- Name: Sale Sale_pkey; Type: CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: Category_nombre_key; Type: INDEX; Schema: public; Owner: red_user
--

CREATE UNIQUE INDEX "Category_nombre_key" ON public."Category" USING btree (nombre);


--
-- Name: GasType_nombre_key; Type: INDEX; Schema: public; Owner: red_user
--

CREATE UNIQUE INDEX "GasType_nombre_key" ON public."GasType" USING btree (nombre);


--
-- Name: Product_codigo_barras_key; Type: INDEX; Schema: public; Owner: red_user
--

CREATE UNIQUE INDEX "Product_codigo_barras_key" ON public."Product" USING btree (codigo_barras);


--
-- Name: clients_identificacion_key; Type: INDEX; Schema: public; Owner: red_user
--

CREATE UNIQUE INDEX clients_identificacion_key ON public.clients USING btree (identificacion);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: red_user
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: Product Product_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SaleItem SaleItem_gasTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_gasTypeId_fkey" FOREIGN KEY ("gasTypeId") REFERENCES public."GasType"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SaleItem SaleItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SaleItem SaleItem_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public."SaleItem"
    ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."Sale"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Sale Sale_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Sale Sale_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: red_user
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO red_user;


--
-- PostgreSQL database dump complete
--

