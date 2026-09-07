--
-- PostgreSQL database dump
--

\restrict 2GDWhBFAJaQzHNXSpwbde8ytpjlzPDsx5TPltf98EwbU7BgAHUcbWE1ypfFhChf

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    category_id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    colour character varying(20) DEFAULT '#4E4B46'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: categories_category_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_category_id_seq OWNED BY public.categories.category_id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    expense_id integer NOT NULL,
    user_id integer NOT NULL,
    category_id integer,
    amount numeric(12,2) NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expenses_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: expenses_expense_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expenses_expense_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expenses_expense_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expenses_expense_id_seq OWNED BY public.expenses.expense_id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    token_id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: password_reset_tokens_token_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_tokens_token_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_tokens_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_tokens_token_id_seq OWNED BY public.password_reset_tokens.token_id;


--
-- Name: saving_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saving_goals (
    goal_id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(255) NOT NULL,
    target_amount numeric(12,2) NOT NULL,
    saved_amount numeric(12,2) DEFAULT 0 NOT NULL,
    deadline date NOT NULL,
    priority integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_complete boolean DEFAULT false,
    completed_at timestamp without time zone,
    is_paused boolean DEFAULT false NOT NULL,
    paused_at timestamp without time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT saving_goals_saved_amount_check CHECK ((saved_amount >= (0)::numeric)),
    CONSTRAINT saving_goals_target_amount_check CHECK ((target_amount > (0)::numeric))
);


--
-- Name: saving_goals_goal_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.saving_goals_goal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: saving_goals_goal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.saving_goals_goal_id_seq OWNED BY public.saving_goals.goal_id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    transaction_id integer NOT NULL,
    user_id integer NOT NULL,
    goal_id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    type character varying(20) NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transactions_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT transactions_type_check CHECK (((type)::text = ANY ((ARRAY['deposit'::character varying, 'withdrawal'::character varying])::text[])))
);


--
-- Name: transactions_transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transactions_transaction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transactions_transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transactions_transaction_id_seq OWNED BY public.transactions.transaction_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    monthly_budget numeric(12,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_earner boolean DEFAULT false NOT NULL,
    currency character varying(10) DEFAULT 'USD'::character varying,
    theme character varying(20) DEFAULT 'classic'::character varying,
    ui_density character varying(20) DEFAULT 'classic'::character varying,
    fiscal_start_month integer DEFAULT 1,
    preferences jsonb DEFAULT '{}'::jsonb,
    onboarding_complete boolean DEFAULT false,
    currency_symbol character varying(5) DEFAULT '$'::character varying,
    monthly_income numeric(12,2),
    is_admin boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    login_locked_until timestamp with time zone
);


--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: categories category_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN category_id SET DEFAULT nextval('public.categories_category_id_seq'::regclass);


--
-- Name: expenses expense_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses ALTER COLUMN expense_id SET DEFAULT nextval('public.expenses_expense_id_seq'::regclass);


--
-- Name: password_reset_tokens token_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN token_id SET DEFAULT nextval('public.password_reset_tokens_token_id_seq'::regclass);


--
-- Name: saving_goals goal_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saving_goals ALTER COLUMN goal_id SET DEFAULT nextval('public.saving_goals_goal_id_seq'::regclass);


--
-- Name: transactions transaction_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions ALTER COLUMN transaction_id SET DEFAULT nextval('public.transactions_transaction_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (category_id, user_id, name, colour, created_at) FROM stdin;
1	1	Food & Dining	#D4A574	2026-06-01 18:14:52.572042+00
2	1	Transport	#243054	2026-06-01 18:14:52.572042+00
3	1	Entertainment	#E8C77A	2026-06-01 18:14:52.572042+00
4	1	Shopping	#4E4B46	2026-06-01 18:14:52.572042+00
5	1	Healthcare	#1A2340	2026-06-01 18:14:52.572042+00
6	1	Utilities	#D4A574	2026-06-01 18:14:52.572042+00
7	1	Other	#4E4B46	2026-06-01 18:14:52.572042+00
8	2	Food & Dining	#D4A574	2026-06-01 18:15:01.062075+00
9	2	Transport	#243054	2026-06-01 18:15:01.062075+00
10	2	Entertainment	#E8C77A	2026-06-01 18:15:01.062075+00
11	2	Shopping	#4E4B46	2026-06-01 18:15:01.062075+00
12	2	Healthcare	#1A2340	2026-06-01 18:15:01.062075+00
13	2	Utilities	#D4A574	2026-06-01 18:15:01.062075+00
14	2	Other	#4E4B46	2026-06-01 18:15:01.062075+00
15	3	Food & Dining	#D4A574	2026-06-01 18:15:56.064585+00
16	3	Transport	#243054	2026-06-01 18:15:56.064585+00
17	3	Entertainment	#E8C77A	2026-06-01 18:15:56.064585+00
18	3	Shopping	#4E4B46	2026-06-01 18:15:56.064585+00
19	3	Healthcare	#1A2340	2026-06-01 18:15:56.064585+00
20	3	Utilities	#D4A574	2026-06-01 18:15:56.064585+00
21	3	Other	#4E4B46	2026-06-01 18:15:56.064585+00
22	4	Food & Dining	#D4A574	2026-06-05 00:10:31.168173+00
23	4	Transport	#243054	2026-06-05 00:10:31.168173+00
24	4	Entertainment	#E8C77A	2026-06-05 00:10:31.168173+00
25	4	Shopping	#4E4B46	2026-06-05 00:10:31.168173+00
26	4	Healthcare	#1A2340	2026-06-05 00:10:31.168173+00
27	4	Utilities	#D4A574	2026-06-05 00:10:31.168173+00
28	4	Other	#4E4B46	2026-06-05 00:10:31.168173+00
29	5	Food & Dining	#D4A574	2026-06-06 22:17:10.443636+00
30	5	Transport	#243054	2026-06-06 22:17:10.443636+00
31	5	Entertainment	#E8C77A	2026-06-06 22:17:10.443636+00
32	5	Shopping	#4E4B46	2026-06-06 22:17:10.443636+00
33	5	Healthcare	#1A2340	2026-06-06 22:17:10.443636+00
34	5	Utilities	#D4A574	2026-06-06 22:17:10.443636+00
35	5	Other	#4E4B46	2026-06-06 22:17:10.443636+00
36	6	Food & Dining	#D4A574	2026-07-05 01:42:19.463188+00
37	6	Transport	#243054	2026-07-05 01:42:19.463188+00
38	6	Entertainment	#E8C77A	2026-07-05 01:42:19.463188+00
39	6	Shopping	#4E4B46	2026-07-05 01:42:19.463188+00
40	6	Healthcare	#1A2340	2026-07-05 01:42:19.463188+00
41	6	Utilities	#D4A574	2026-07-05 01:42:19.463188+00
42	6	Other	#4E4B46	2026-07-05 01:42:19.463188+00
43	7	Food & Dining	#D4A574	2026-07-05 01:44:39.104106+00
44	7	Transport	#243054	2026-07-05 01:44:39.104106+00
45	7	Entertainment	#E8C77A	2026-07-05 01:44:39.104106+00
46	7	Shopping	#4E4B46	2026-07-05 01:44:39.104106+00
47	7	Healthcare	#1A2340	2026-07-05 01:44:39.104106+00
48	7	Utilities	#D4A574	2026-07-05 01:44:39.104106+00
49	7	Other	#4E4B46	2026-07-05 01:44:39.104106+00
50	8	Food & Dining	#D4A574	2026-07-13 01:38:05.162578+00
51	8	Transport	#243054	2026-07-13 01:38:05.162578+00
52	8	Entertainment	#E8C77A	2026-07-13 01:38:05.162578+00
53	8	Shopping	#4E4B46	2026-07-13 01:38:05.162578+00
54	8	Healthcare	#1A2340	2026-07-13 01:38:05.162578+00
55	8	Utilities	#D4A574	2026-07-13 01:38:05.162578+00
56	8	Other	#4E4B46	2026-07-13 01:38:05.162578+00
57	9	Food & Dining	#D4A574	2026-07-13 01:47:33.465308+00
58	9	Transport	#243054	2026-07-13 01:47:33.465308+00
59	9	Entertainment	#E8C77A	2026-07-13 01:47:33.465308+00
60	9	Shopping	#4E4B46	2026-07-13 01:47:33.465308+00
61	9	Healthcare	#1A2340	2026-07-13 01:47:33.465308+00
62	9	Utilities	#D4A574	2026-07-13 01:47:33.465308+00
63	9	Other	#4E4B46	2026-07-13 01:47:33.465308+00
64	10	Food & Dining	#D4A574	2026-07-24 15:30:33.60318+00
65	10	Transport	#243054	2026-07-24 15:30:33.60318+00
66	10	Entertainment	#E8C77A	2026-07-24 15:30:33.60318+00
67	10	Shopping	#4E4B46	2026-07-24 15:30:33.60318+00
68	10	Healthcare	#1A2340	2026-07-24 15:30:33.60318+00
69	10	Utilities	#D4A574	2026-07-24 15:30:33.60318+00
70	10	Other	#4E4B46	2026-07-24 15:30:33.60318+00
71	11	Food & Dining	#D4A574	2026-07-25 18:28:52.69787+00
72	11	Transport	#243054	2026-07-25 18:28:52.69787+00
73	11	Entertainment	#E8C77A	2026-07-25 18:28:52.69787+00
74	11	Shopping	#4E4B46	2026-07-25 18:28:52.69787+00
75	11	Healthcare	#1A2340	2026-07-25 18:28:52.69787+00
76	11	Utilities	#D4A574	2026-07-25 18:28:52.69787+00
77	11	Other	#4E4B46	2026-07-25 18:28:52.69787+00
78	12	Food & Dining	#D4A574	2026-07-26 15:13:30.27497+00
79	12	Transport	#243054	2026-07-26 15:13:30.27497+00
80	12	Entertainment	#E8C77A	2026-07-26 15:13:30.27497+00
81	12	Shopping	#4E4B46	2026-07-26 15:13:30.27497+00
82	12	Healthcare	#1A2340	2026-07-26 15:13:30.27497+00
83	12	Utilities	#D4A574	2026-07-26 15:13:30.27497+00
84	12	Other	#4E4B46	2026-07-26 15:13:30.27497+00
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expenses (expense_id, user_id, category_id, amount, note, expense_date, created_at) FROM stdin;
1	4	24	80.00	movie	2026-06-07	2026-06-07 15:14:54.475132+00
2	4	22	70.00	lunch	2026-06-01	2026-06-07 15:15:17.528595+00
3	4	23	30.00	transport	2026-06-07	2026-06-07 17:48:53.836194+00
4	4	24	700.00	movie	2026-07-05	2026-07-05 01:03:31.98935+00
5	4	23	80.00	car	2026-07-10	2026-07-10 18:02:28.734877+00
6	6	36	10.00	Fries	2026-07-15	2026-07-15 13:08:15.391699+00
7	6	37	40.00	IN and OUT HAATSO to CIRCLE	2026-07-15	2026-07-15 13:22:42.691245+00
8	6	39	90.00		2026-07-19	2026-07-19 12:22:30.756505+00
9	6	41	90.00		2026-07-19	2026-07-19 14:17:29.728106+00
10	4	23	8.00	From Haatso to 37	2026-07-25	2026-07-25 18:20:19.179526+00
11	4	28	25.00	CREDIT	2026-08-17	2026-08-17 02:16:19.469328+00
12	4	28	1.00		2026-08-17	2026-08-17 02:20:47.895197+00
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (token_id, user_id, token_hash, expires_at, used_at, created_at) FROM stdin;
\.


--
-- Data for Name: saving_goals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.saving_goals (goal_id, user_id, name, target_amount, saved_amount, deadline, priority, created_at, is_complete, completed_at, is_paused, paused_at, deleted_at) FROM stdin;
38	4	Laptop	32000.00	33900.00	2026-09-01	1	2026-07-10 15:14:29.717247+00	t	2026-07-10 15:15:40.650571	f	\N	2026-07-26 00:19:02.184516+00
4	4	Update my closet	1000.00	1190.00	2026-08-05	1	2026-06-16 16:54:39.618058+00	t	2026-07-10 15:13:17.745093	f	\N	2026-07-26 00:19:07.393848+00
1	3	Bali Trip	90.00	30.00	2027-08-06	1	2026-06-01 18:16:44.162953+00	f	\N	f	\N	\N
5	7	Buy New Phone	2500.00	300.00	2026-12-09	1	2026-07-07 16:58:52.009114+00	f	\N	f	\N	\N
46	6	Bali Trip	900.00	580.00	2028-01-01	1	2026-07-15 17:51:55.05475+00	f	\N	f	\N	\N
43	6	Christmas	8000.00	3500.00	2026-12-25	1	2026-07-15 17:20:46.399336+00	f	\N	t	2026-07-19 14:17:08.640835	\N
40	8	Emergency Fund	10000.00	0.00	2027-12-31	2	2026-07-13 01:38:27.464777+00	f	\N	f	\N	\N
57	4	SAM	7000.00	0.00	2027-02-03	2	2026-08-17 02:47:45.656876+00	f	\N	t	2026-08-17 00:00:00	2026-08-17 15:02:45.168525+00
52	4	VACATION IN THE CAPE VERDE	10000.00	10000.00	2028-01-01	1	2026-07-26 00:47:51.213059+00	t	2026-07-26 15:11:20.758762	f	\N	2026-08-17 15:02:50.179045+00
42	9	christmas	1000.00	0.00	2026-12-02	1	2026-07-13 01:48:28.763921+00	f	\N	f	\N	\N
45	6	MacBook Pro	9000.00	0.00	2027-01-02	1	2026-07-15 17:51:24.294138+00	f	\N	f	\N	2026-07-15 19:33:41.132478+00
49	6	rtyu	234.00	0.00	2026-10-01	1	2026-07-16 17:00:54.5875+00	f	\N	f	\N	2026-07-16 17:41:51.946663+00
50	11	car	100000.00	8000.00	2028-01-01	1	2026-07-25 18:57:02.359646+00	f	\N	f	\N	\N
39	4	Emergency Fund	800.00	700.00	2026-12-01	1	2026-07-10 15:45:57.517411+00	t	2026-07-26 00:17:51.05951	f	\N	2026-07-26 00:18:35.232092+00
47	6	Monthers day	100.00	140.00	2026-09-12	1	2026-07-15 17:53:07.663263+00	t	2026-07-18 22:49:42.13544	f	\N	2026-07-18 23:02:45.312469+00
44	6	Phone	200.00	80.00	2026-10-01	2	2026-07-15 17:50:19.594698+00	f	\N	f	\N	\N
54	12	rrrr	111.00	0.00	2027-01-01	2	2026-07-26 17:52:51.427408+00	f	\N	t	2026-07-26 00:00:00	\N
41	8	Vacation	3000.00	0.00	2026-12-31	1	2026-07-13 01:38:27.498692+00	f	\N	f	\N	\N
53	12	Ball	10.00	0.00	2026-08-01	3	2026-07-26 15:16:12.328957+00	f	\N	t	2026-07-26 00:00:00	\N
55	12	baa	11.00	0.00	2027-01-01	1	2026-07-26 18:01:08.67735+00	f	\N	t	2026-07-26 00:00:00	\N
51	4	cloths	400.00	810.00	2026-08-31	2	2026-07-25 19:46:02.171557+00	t	2026-08-17 02:18:11.385734	f	\N	2026-08-17 15:02:40.719027+00
56	4	IPHONE 15 PRO MAX	8000.00	790.00	2027-01-01	1	2026-08-17 02:17:32.01852+00	f	\N	f	\N	2026-09-01 02:41:50.350165+00
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transactions (transaction_id, user_id, goal_id, amount, type, note, created_at) FROM stdin;
16	4	4	90.00	deposit		2026-07-05 01:00:57.273607+00
17	4	4	600.00	deposit		2026-07-05 01:01:39.458016+00
24	3	1	30.00	deposit		2026-07-05 01:30:12.416546+00
25	7	5	300.00	deposit	uncle's allowance	2026-07-07 17:00:06.302096+00
58	4	4	500.00	deposit		2026-07-10 15:13:17.655656+00
59	4	38	900.00	deposit		2026-07-10 15:15:05.60456+00
60	4	38	3000.00	deposit		2026-07-10 15:15:24.268703+00
61	4	38	30000.00	deposit		2026-07-10 15:15:40.63825+00
62	4	39	200.00	deposit	monthly allowance	2026-07-10 16:42:10.953992+00
63	6	43	100.00	deposit	Uncles allowance	2026-07-15 17:23:45.030612+00
64	6	43	6000.00	deposit		2026-07-15 17:24:39.444834+00
65	6	46	600.00	deposit		2026-07-15 18:10:00.282153+00
66	6	47	90.00	deposit		2026-07-15 18:10:24.165578+00
68	6	47	50.00	deposit		2026-07-18 22:49:42.075249+00
73	6	43	1100.00	withdrawal	Fee's	2026-07-18 23:16:56.680468+00
74	6	43	1500.00	withdrawal		2026-07-18 23:18:10.173053+00
75	6	44	80.00	deposit		2026-07-18 23:18:52.963759+00
76	6	46	80.00	deposit		2026-07-19 12:22:03.420598+00
77	6	46	100.00	withdrawal		2026-07-19 12:58:49.81546+00
78	4	39	90.00	deposit		2026-07-25 18:19:10.70378+00
79	11	50	8000.00	deposit		2026-07-25 18:58:39.896214+00
80	4	39	700.00	deposit		2026-07-26 00:17:50.923315+00
81	4	39	90.00	withdrawal		2026-07-26 00:18:09.010846+00
82	4	39	200.00	withdrawal		2026-07-26 00:18:20.874113+00
83	4	52	900.00	deposit		2026-07-26 14:15:58.313281+00
84	4	52	8000.00	deposit		2026-07-26 14:16:18.685753+00
85	4	51	10.00	deposit		2026-07-26 14:16:44.358046+00
86	4	52	1100.00	deposit		2026-07-26 15:11:20.705461+00
87	4	56	90.00	deposit		2026-08-17 02:17:52.593733+00
88	4	51	800.00	deposit		2026-08-17 02:18:11.361012+00
89	4	56	700.00	deposit	Aunty gave me money	2026-08-17 15:02:28.918733+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (user_id, first_name, last_name, email, password_hash, monthly_budget, created_at, is_earner, currency, theme, ui_density, fiscal_start_month, preferences, onboarding_complete, currency_symbol, monthly_income, is_admin, is_active, failed_login_attempts, login_locked_until) FROM stdin;
8	Screen	Shot	screenshot_1783906684@example.test	$2b$10$mXs1SeFXYTgYHTrGpT8lMeO9Vo4xwKX312KlAwphap8XH1ljsVAyy	\N	2026-07-13 01:38:05.1422+00	f	USD	classic	classic	1	{}	t	$	\N	f	t	0	\N
7	old	user	olduser22@gmail.com	$2b$10$TZI.Jmy68fd.bGUWIgqLq.7OmeOW0r/4GREU3yX1iZje1H.77u0Y.	\N	2026-07-05 01:44:39.092792+00	f	USD	classic	classic	1	{}	t	$	\N	f	t	0	\N
5	kwame	Morgan	kwame@gmail.com	$2b$10$cPU0ufJ6RZXZsgRqQ.LYHebqWkKPFbYAvl9Bn48o0Z6pwrvq055Fu	\N	2026-06-06 22:17:10.429551+00	f	USD	classic	classic	1	{}	f	$	\N	f	f	0	\N
9	Kwadwo	Amoako	amoakokwadwo25@gmail.com	$2b$10$6y0ofcoIg8y.TBQIUOoCw.PFTG7L3aLxVetL316l.ctTG/b8ZBIay	800.00	2026-07-13 01:47:33.44725+00	f	USD	classic	classic	1	{}	t	$	\N	f	t	0	\N
12	James	Gunn	Gunner1@gmail.com	$2b$10$LdrOSebRuTwDQzwPRYT1DOafkgAmXg.KQU7GrEwDPBKrhWwLmQKc6	\N	2026-07-26 15:13:30.248162+00	f	GHS	classic	classic	1	{"budget_runway": [50, 75, 90], "feasibility_decay": true}	t	₵	\N	f	t	0	\N
2	Codex	Test	codex_1780337700@example.test	$2b$10$qtw/ijRlFOmm5n8ieRg/CeViokqQBGVIEP5O9Jx6tRk1o3EdYB84O	\N	2026-06-01 18:15:01.057736+00	f	USD	classic	classic	1	{}	f	$	\N	f	f	0	\N
1	Codex	Test	codex_1780337692@example.test	$2b$10$GKH8mcZYBPWdbC7AOrSLmudkv8eaAQuA9gGhzia2FiUV8yf6jXYDy	\N	2026-06-01 18:14:52.566928+00	f	USD	classic	classic	1	{}	f	$	\N	f	f	0	\N
11	JOJO	MOAMOA	jomoa21@gmail.com	$2b$10$9Rf1lJqA6lyzKckf8u8WKe6IE6bEo8OZ.iDGrPxb7XFQ4vI/WeKF.	\N	2026-07-25 18:28:52.646039+00	f	USD	classic	classic	1	{}	t	$	\N	f	t	0	\N
3	Joy	Banini	joyban22@gmail.com	$2b$10$2UM5xtbEj38urnS022Rmku089NnwzXn6FIF.zwpmA7lA94MTZgBn2	60.00	2026-06-01 18:15:56.059393+00	f	USD	classic	classic	1	{}	t	$	\N	f	t	0	\N
4	Denzel	Test	Securetester2@gmail.com	$2b$10$jngbBYMbq/FRITH2jNRZmuKbjoYPrj2Xv7HmaSZ4Q2ND41SK6AAFW	21.00	2026-06-05 00:10:31.131926+00	t	USD	classic	classic	1	{"budget_runway": [50, 75, 90], "feasibility_decay": true}	t	$	\N	t	t	0	\N
10	iolo	mokoa	iolowadwo25@gmail.com	$2b$10$1yBQQdOlQ.TPtWBsdZqaIukWCu3z77NMZLAZsbceP.LgBtO0m7ajW	160.00	2026-07-24 15:30:33.564219+00	t	USD	classic	classic	1	{}	t	$	800.00	f	t	0	\N
6	New	User	Newuser22@gmail.com	$2b$10$g0Q7mJ7TDNMo02oyM3diMOqc9najiasmN8dcn4iJrF8uuvvjuQ3ia	1000.00	2026-07-05 01:42:19.445834+00	t	GHS	classic	classic	1	{"budget_runway": [50, 75, 90], "feasibility_decay": true}	t	$	1000.00	f	t	0	\N
\.


--
-- Name: categories_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categories_category_id_seq', 84, true);


--
-- Name: expenses_expense_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expenses_expense_id_seq', 12, true);


--
-- Name: password_reset_tokens_token_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.password_reset_tokens_token_id_seq', 1, false);


--
-- Name: saving_goals_goal_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.saving_goals_goal_id_seq', 57, true);


--
-- Name: transactions_transaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.transactions_transaction_id_seq', 89, true);


--
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_user_id_seq', 12, true);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (category_id);


--
-- Name: categories categories_user_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_name_key UNIQUE (user_id, name);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (expense_id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (token_id);


--
-- Name: password_reset_tokens password_reset_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: saving_goals saving_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saving_goals
    ADD CONSTRAINT saving_goals_pkey PRIMARY KEY (goal_id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (transaction_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_categories_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_user_id ON public.categories USING btree (user_id);


--
-- Name: idx_expenses_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_user_date ON public.expenses USING btree (user_id, expense_date);


--
-- Name: idx_password_reset_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens USING btree (expires_at);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_saving_goals_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saving_goals_deleted_at ON public.saving_goals USING btree (user_id, deleted_at);


--
-- Name: idx_saving_goals_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saving_goals_user_id ON public.saving_goals USING btree (user_id);


--
-- Name: idx_saving_goals_user_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saving_goals_user_priority ON public.saving_goals USING btree (user_id, is_complete, is_paused, priority, goal_id);


--
-- Name: idx_transactions_goal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_goal_id ON public.transactions USING btree (goal_id);


--
-- Name: idx_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);


--
-- Name: categories categories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: expenses expenses_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id) ON DELETE SET NULL;


--
-- Name: expenses expenses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: saving_goals saving_goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saving_goals
    ADD CONSTRAINT saving_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: transactions transactions_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.saving_goals(goal_id) ON DELETE CASCADE;


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 2GDWhBFAJaQzHNXSpwbde8ytpjlzPDsx5TPltf98EwbU7BgAHUcbWE1ypfFhChf

