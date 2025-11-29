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


--
-- Name: InstallmentStatus; Type: TYPE; Schema: public; Owner: red_user
--

CREATE TYPE public."InstallmentStatus" AS ENUM (
    'PENDING',
    'PAID',
    'OVERDUE'
);


ALTER TYPE public."InstallmentStatus" OWNER TO red_user;

--
-- Name: RentalStatus; Type: TYPE; Schema: public; Owner: red_user
--

CREATE TYPE public."RentalStatus" AS ENUM (
    'RENTED',
    'OVERDUE',
    'DELIVERED',
    'CANCELLED'
);


ALTER TYPE public."RentalStatus" OWNER TO red_user;

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
    recibio_envase boolean DEFAULT false NOT NULL,
    "taxAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "taxRateApplied" numeric(5,4) DEFAULT 0 NOT NULL
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
-- Name: credit_installments; Type: TABLE; Schema: public; Owner: red_user
--

CREATE TABLE public.credit_installments (
    id integer NOT NULL,
    "saleId" integer NOT NULL,
    "installmentNumber" integer NOT NULL,
    "amountDue" numeric(10,2) NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    status public."InstallmentStatus" DEFAULT 'PENDING'::public."InstallmentStatus" NOT NULL,
    "paidAt" timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.credit_installments OWNER TO red_user;

--
-- Name: credit_installments_id_seq; Type: SEQUENCE; Schema: public; Owner: red_user
--

CREATE SEQUENCE public.credit_installments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.credit_installments_id_seq OWNER TO red_user;

--
-- Name: credit_installments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: red_user
--

ALTER SEQUENCE public.credit_installments_id_seq OWNED BY public.credit_installments.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: red_user
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    "saleId" integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    "paymentMethod" text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.payments OWNER TO red_user;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: red_user
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO red_user;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: red_user
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: rentals; Type: TABLE; Schema: public; Owner: red_user
--

CREATE TABLE public.rentals (
    id integer NOT NULL,
    "washingMachineId" integer NOT NULL,
    "clientId" integer NOT NULL,
    "rentalPrice" numeric(10,2) NOT NULL,
    rental_date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    scheduled_return_date timestamp(3) without time zone NOT NULL,
    actual_return_date timestamp(3) without time zone,
    status public."RentalStatus" DEFAULT 'RENTED'::public."RentalStatus" NOT NULL,
    "userId" integer NOT NULL,
    "hoursRented" integer DEFAULT 1 NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.rentals OWNER TO red_user;

--
-- Name: rentals_id_seq; Type: SEQUENCE; Schema: public; Owner: red_user
--

CREATE SEQUENCE public.rentals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rentals_id_seq OWNER TO red_user;

--
-- Name: rentals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: red_user
--

ALTER SEQUENCE public.rentals_id_seq OWNED BY public.rentals.id;


--
-- Name: sales; Type: TABLE; Schema: public; Owner: red_user
--

CREATE TABLE public.sales (
    id integer NOT NULL,
    total numeric(10,2) NOT NULL,
    "paymentStatus" text DEFAULT 'PAID'::text NOT NULL,
    "totalPaid" numeric(10,2) DEFAULT 0 NOT NULL,
    "clientId" integer NOT NULL,
    "userId" integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.sales OWNER TO red_user;

--
-- Name: sales_id_seq; Type: SEQUENCE; Schema: public; Owner: red_user
--

CREATE SEQUENCE public.sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_id_seq OWNER TO red_user;

--
-- Name: sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: red_user
--

ALTER SEQUENCE public.sales_id_seq OWNED BY public.sales.id;


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
-- Name: washing_machines; Type: TABLE; Schema: public; Owner: red_user
--

CREATE TABLE public.washing_machines (
    id integer NOT NULL,
    description text NOT NULL,
    "pricePerHour" numeric(10,2) NOT NULL,
    "initialQuantity" integer DEFAULT 1 NOT NULL,
    "availableQuantity" integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.washing_machines OWNER TO red_user;

--
-- Name: washing_machines_id_seq; Type: SEQUENCE; Schema: public; Owner: red_user
--

CREATE SEQUENCE public.washing_machines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.washing_machines_id_seq OWNER TO red_user;

--
-- Name: washing_machines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: red_user
--

ALTER SEQUENCE public.washing_machines_id_seq OWNED BY public.washing_machines.id;


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
-- Name: SaleItem id; Type: DEFAULT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public."SaleItem" ALTER COLUMN id SET DEFAULT nextval('public."SaleItem_id_seq"'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: credit_installments id; Type: DEFAULT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.credit_installments ALTER COLUMN id SET DEFAULT nextval('public.credit_installments_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: rentals id; Type: DEFAULT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.rentals ALTER COLUMN id SET DEFAULT nextval('public.rentals_id_seq'::regclass);


--
-- Name: sales id; Type: DEFAULT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.sales ALTER COLUMN id SET DEFAULT nextval('public.sales_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: washing_machines id; Type: DEFAULT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.washing_machines ALTER COLUMN id SET DEFAULT nextval('public.washing_machines_id_seq'::regclass);


--
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public."Category" (id, nombre) FROM stdin;
1	Cacharrería
6	Electrodomésticos
7	Hogar
8	Limpieza
9	Otros
\.


--
-- Data for Name: GasType; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public."GasType" (id, nombre, stock_llenos, stock_vacios, precio_venta, precio_envase) FROM stdin;
4	Balón 5lb	3	29	8000.00	12000.00
5	Cilindro 20lb	148	31	25000.00	40000.00
6	Cilindro 40lb	98	20	45000.00	60000.00
1	Cilindro 10lb	198	50	15000.00	25000.00
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public."Product" (id, nombre, codigo_barras, precio_venta, costo, stock, stock_minimo, "categoryId") FROM stdin;
1	Olla de Aluminio 2L	001	25000.00	15000.00	8	5	1
5	Plato Hondo Cerámica	005	12000.00	7000.00	9	6	1
6	Taza Cerámica 300ml	004	8500.00	4500.00	16	10	1
3	Juego de Cucharas Acero	003	18000.00	10000.00	13	8	1
2	Sartén Antiadherente 24cm	002	35000.00	20000.00	6	3	1
\.


--
-- Data for Name: SaleItem; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public."SaleItem" (id, "saleId", "productId", "gasTypeId", cantidad, precio_unit, subtotal, recibio_envase, "taxAmount", "taxRateApplied") FROM stdin;
1	1	1	\N	1	25000.00	25000.00	f	0.00	0.0000
2	1	\N	4	21	8000.00	168000.00	t	0.00	0.0000
3	2	\N	1	1	40000.00	40000.00	f	0.00	0.0000
4	3	5	\N	1	12000.00	12000.00	f	0.00	0.0000
5	4	\N	5	1	25000.00	25000.00	t	0.00	0.0000
6	4	\N	4	1	20000.00	20000.00	f	0.00	0.0000
7	5	1	\N	1	25000.00	25000.00	f	0.00	0.0000
8	6	5	\N	1	12000.00	12000.00	f	0.00	0.0000
9	6	\N	5	1	65000.00	65000.00	f	0.00	0.0000
10	7	\N	6	1	105000.00	105000.00	f	0.00	0.0000
11	8	5	\N	1	12000.00	12000.00	f	0.00	0.0000
12	9	6	\N	4	8500.00	34000.00	f	0.00	0.0000
13	10	3	\N	2	18000.00	36000.00	f	0.00	0.0000
14	11	2	\N	1	35000.00	35000.00	f	0.00	0.0000
15	12	\N	6	1	105000.00	105000.00	f	0.00	0.0000
16	13	\N	1	1	40000.00	40000.00	f	0.00	0.0000
17	14	2	\N	1	35000.00	35000.00	f	0.00	0.0000
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public.clients (id, nombre, identificacion, telefono, direccion, created_at, updated_at) FROM stdin;
1	Cliente Genérico	N/A	3124943527	N/A	2025-11-26 20:07:33.126	2025-11-28 04:59:05.316
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public.companies (id, name, tax_id, address, phone, email, logo_url, created_at, updated_at) FROM stdin;
1	Cacharrería Gas POS	123456789-0	Calle Principal #123	+593 2 123 4567	info@cacharreriagas.com	/uploads/logos/logo-1764190134281-27730172.jpg	2025-11-26 20:07:33.215	2025-11-26 20:48:55.903
\.


--
-- Data for Name: credit_installments; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public.credit_installments (id, "saleId", "installmentNumber", "amountDue", "dueDate", status, "paidAt", created_at, updated_at) FROM stdin;
4	11	1	17500.00	2025-11-27 00:08:39.658	PAID	2025-11-27 01:25:20.113	2025-11-27 00:08:52.246	2025-11-27 01:25:20.114
1	10	1	12000.00	2025-11-26 23:58:09.852	PAID	2025-11-27 01:47:35.564	2025-11-26 23:58:24.715	2025-11-27 01:47:35.566
3	10	3	12000.00	2026-01-25 23:58:09.852	PAID	2025-11-27 03:38:50.329	2025-11-26 23:58:24.715	2025-11-27 03:38:50.331
2	10	2	12000.00	2025-12-26 23:58:09.852	PAID	2025-11-27 03:38:50.329	2025-11-26 23:58:24.715	2025-11-27 03:38:50.331
5	11	2	17500.00	2025-12-27 00:08:39.658	PAID	2025-11-27 03:41:58.006	2025-11-27 00:08:52.246	2025-11-27 03:41:58.007
7	13	2	20000.00	2025-12-28 00:00:00	PENDING	\N	2025-11-27 14:14:08.171	2025-11-27 14:14:08.171
6	13	1	20000.00	2025-11-28 00:00:00	PAID	2025-11-28 05:00:12.79	2025-11-27 14:14:08.171	2025-11-28 14:12:55.743
8	14	1	17500.00	2025-11-28 01:58:24.639	PENDING	\N	2025-11-28 01:58:37.984	2025-11-28 01:58:37.984
9	14	2	17500.00	2025-12-28 01:58:24.639	PENDING	\N	2025-11-28 01:58:37.984	2025-11-28 01:58:37.984
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public.payments (id, "saleId", amount, "paymentMethod", date, created_at) FROM stdin;
1	1	100000.00	CASH	2025-11-26 20:37:19.011	2025-11-26 20:37:19.013
2	1	93000.00	TRANSFER	2025-11-26 20:37:19.011	2025-11-26 20:37:19.013
3	2	40000.00	CREDIT_CARD	2025-11-26 20:55:41.642	2025-11-26 20:55:41.643
4	3	50000.00	CASH	2025-11-26 21:01:30.049	2025-11-26 21:01:30.052
5	4	50000.00	CASH	2025-11-26 21:56:17.4	2025-11-26 21:56:17.401
6	5	25000.00	CREDIT	2025-11-26 22:55:08.887	2025-11-26 22:55:08.889
7	5	0.00	CASH	2025-11-26 22:55:08.887	2025-11-26 22:55:08.889
8	6	77000.00	CREDIT	2025-11-26 23:19:22.662	2025-11-26 23:19:22.663
9	6	0.00	CASH	2025-11-26 23:19:22.662	2025-11-26 23:19:22.663
10	7	105000.00	CREDIT	2025-11-26 23:21:37.015	2025-11-26 23:21:37.016
11	7	0.00	CASH	2025-11-26 23:21:37.015	2025-11-26 23:21:37.016
12	8	12000.00	CREDIT	2025-11-26 23:28:33.314	2025-11-26 23:28:33.315
13	8	0.00	CASH	2025-11-26 23:28:33.314	2025-11-26 23:28:33.315
14	9	34000.00	CREDIT	2025-11-26 23:42:55.197	2025-11-26 23:42:55.199
15	9	0.00	CASH	2025-11-26 23:42:55.197	2025-11-26 23:42:55.199
16	10	36000.00	CREDIT	2025-11-26 23:58:24.71	2025-11-26 23:58:24.712
17	10	0.00	CASH	2025-11-26 23:58:24.711	2025-11-26 23:58:24.712
18	11	35000.00	CREDIT	2025-11-27 00:08:52.238	2025-11-27 00:08:52.24
19	11	0.00	CASH	2025-11-27 00:08:52.238	2025-11-27 00:08:52.24
20	11	17500.00	CASH	2025-11-27 01:25:20.095	2025-11-27 01:25:20.097
21	10	12000.00	CASH	2025-11-27 01:47:35.559	2025-11-27 01:47:35.561
23	10	12000.00	CASH	2025-11-27 03:38:50.309	2025-11-27 03:38:50.311
22	10	12000.00	CASH	2025-11-27 03:38:50.311	2025-11-27 03:38:50.313
24	11	17500.00	TRANSFER	2025-11-27 03:41:58.005	2025-11-27 03:41:58.006
57	12	3000.00	CASH	2025-11-27 13:56:51.419	2025-11-27 13:56:51.421
58	12	102000.00	CASH	2025-11-27 13:56:51.419	2025-11-27 13:56:51.421
59	13	40000.00	CREDIT	2025-11-27 14:14:08.167	2025-11-27 14:14:08.169
60	13	0.00	CASH	2025-11-27 14:14:08.167	2025-11-27 14:14:08.169
61	13	20000.00	CASH	2025-11-28 05:00:12.781	2025-11-28 14:12:55.733
62	14	35000.00	CREDIT	2025-11-28 01:58:37.975	2025-11-28 01:58:37.976
63	14	0.00	CASH	2025-11-28 01:58:37.975	2025-11-28 01:58:37.976
\.


--
-- Data for Name: rentals; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public.rentals (id, "washingMachineId", "clientId", "rentalPrice", rental_date, scheduled_return_date, actual_return_date, status, "userId", "hoursRented", notes, created_at, updated_at) FROM stdin;
1	3	1	18000.00	2025-11-26 21:00:07.127	2025-11-27 01:00:05.056	2025-11-27 00:54:26.585	DELIVERED	1	4	Recargo adicional: $13500	2025-11-26 21:00:07.128	2025-11-27 00:54:26.587
3	2	1	24000.00	2025-11-27 13:40:19.623	2025-11-27 16:40:18.607	2025-11-27 17:09:56.622	DELIVERED	1	3	\N	2025-11-27 13:40:19.625	2025-11-27 17:09:56.627
2	1	1	11000.00	2025-11-27 13:39:26.067	2025-11-27 15:39:23.192	2025-11-27 17:10:05.118	DELIVERED	1	2	\N	2025-11-27 13:39:26.069	2025-11-27 17:10:05.124
4	2	1	32000.00	2025-11-27 13:40:26.423	2025-11-27 17:40:25.126	2025-11-27 18:13:25.015	DELIVERED	1	4	Recargo adicional: $16000	2025-11-27 13:40:26.424	2025-11-27 18:13:25.017
5	3	1	18000.00	2025-11-27 13:41:16.768	2025-11-27 17:41:11.285	2025-11-27 18:14:03.627	DELIVERED	1	4	Recargo adicional: $9000	2025-11-27 13:41:16.77	2025-11-27 18:14:03.629
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public.sales (id, total, "paymentStatus", "totalPaid", "clientId", "userId", created_at, updated_at) FROM stdin;
1	193000.00	PAID	193000.00	1	1	2025-11-26 20:37:18.999	2025-11-26 20:37:18.999
2	40000.00	PAID	40000.00	1	1	2025-11-26 20:55:41.633	2025-11-26 20:55:41.633
3	12000.00	PAID	50000.00	1	1	2025-11-26 21:01:30.045	2025-11-26 21:01:30.045
4	45000.00	PAID	50000.00	1	1	2025-11-26 21:56:17.387	2025-11-26 21:56:17.387
5	25000.00	PAID	25000.00	1	1	2025-11-26 22:55:08.877	2025-11-26 22:55:08.877
6	77000.00	PAID	77000.00	1	1	2025-11-26 23:19:22.656	2025-11-26 23:19:22.656
7	105000.00	PAID	105000.00	1	1	2025-11-26 23:21:37.008	2025-11-26 23:21:37.008
8	12000.00	PAID	12000.00	1	1	2025-11-26 23:28:33.302	2025-11-26 23:28:33.302
9	34000.00	PAID	34000.00	1	1	2025-11-26 23:42:55.19	2025-11-26 23:42:55.19
10	36000.00	PENDING	0.00	1	1	2025-11-26 23:58:24.703	2025-11-26 23:58:24.703
11	35000.00	PAID	0.00	1	1	2025-11-27 00:08:52.231	2025-11-27 03:41:58.009
12	105000.00	PAID	105000.00	1	1	2025-11-27 13:56:51.403	2025-11-27 13:56:51.403
13	40000.00	PENDING	0.00	1	1	2025-11-27 14:14:08.161	2025-11-27 14:14:08.161
14	35000.00	PENDING	0.00	1	1	2025-11-28 01:58:37.943	2025-11-28 01:58:37.943
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public.users (id, nombre, username, password, role, created_at, updated_at) FROM stdin;
1	Administrador	admin	$2a$10$BfYR9FdLQp1Zb8hLa8M94.di405oS80nSE/wwG.fkcHBJ6tzioSHq	ADMIN	2025-11-26 20:07:33.031	2025-11-26 20:07:33.031
2	Vendedor Default	vendedor	$2a$10$Q2qoZSbWMMGkNcNW0A/du.AwNf/94JGFk5vRVbtFFCKB7WmXjCdmG	VENDEDOR	2025-11-26 20:07:33.118	2025-11-26 20:07:33.118
\.


--
-- Data for Name: washing_machines; Type: TABLE DATA; Schema: public; Owner: red_user
--

COPY public.washing_machines (id, description, "pricePerHour", "initialQuantity", "availableQuantity", created_at, updated_at) FROM stdin;
1	Lavadora Samsung 8kg	5500.00	3	3	2025-11-26 20:07:33.203	2025-11-27 17:10:05.126
2	Lavadora LG 10kg	8000.00	2	2	2025-11-26 20:07:33.207	2025-11-27 18:13:25.025
3	Lavadora Whirlpool 7kg	4500.00	2	2	2025-11-26 20:07:33.21	2025-11-27 18:14:03.633
\.


--
-- Name: Category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public."Category_id_seq"', 9, true);


--
-- Name: GasType_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public."GasType_id_seq"', 6, true);


--
-- Name: Product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public."Product_id_seq"', 6, true);


--
-- Name: SaleItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public."SaleItem_id_seq"', 17, true);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public.clients_id_seq', 1, true);


--
-- Name: credit_installments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public.credit_installments_id_seq', 9, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public.payments_id_seq', 63, true);


--
-- Name: rentals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public.rentals_id_seq', 5, true);


--
-- Name: sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public.sales_id_seq', 14, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: washing_machines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: red_user
--

SELECT pg_catalog.setval('public.washing_machines_id_seq', 3, true);


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
-- Name: credit_installments credit_installments_pkey; Type: CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.credit_installments
    ADD CONSTRAINT credit_installments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: rentals rentals_pkey; Type: CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: washing_machines washing_machines_pkey; Type: CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.washing_machines
    ADD CONSTRAINT washing_machines_pkey PRIMARY KEY (id);


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
    ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public.sales(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: credit_installments credit_installments_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.credit_installments
    ADD CONSTRAINT "credit_installments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public.sales(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payments payments_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public.sales(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rentals rentals_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT "rentals_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rentals rentals_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT "rentals_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rentals rentals_washingMachineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT "rentals_washingMachineId_fkey" FOREIGN KEY ("washingMachineId") REFERENCES public.washing_machines(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sales sales_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "sales_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sales sales_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: red_user
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "sales_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: red_user
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

