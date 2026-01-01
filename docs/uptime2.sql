--
-- PostgreSQL database dump
--

\restrict 4nsr8cj4nF25Zb4DFonFOmFBO9yAtMtTP1JF2UUhGwMeXhCcn50T9kq0YuG6PSb

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-01-01 11:24:02

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 223 (class 1259 OID 16494)
-- Name: analytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analytics (
    id integer NOT NULL,
    website_url character varying(254) NOT NULL,
    ping5 integer,
    checked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.analytics OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16493)
-- Name: analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.analytics ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.analytics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 227 (class 1259 OID 16522)
-- Name: average_day; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.average_day (
    id integer NOT NULL,
    website_url character varying(254) NOT NULL,
    avg integer,
    checked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.average_day OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16521)
-- Name: average_day_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.average_day ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.average_day_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 225 (class 1259 OID 16508)
-- Name: average_hr; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.average_hr (
    id integer NOT NULL,
    website_url character varying(254) NOT NULL,
    avg integer,
    checked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.average_hr OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16507)
-- Name: average_hr_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.average_hr ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.average_hr_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 221 (class 1259 OID 16478)
-- Name: ownership; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ownership (
    website_url character varying(254) NOT NULL,
    owner_email character varying(254) NOT NULL,
    is_public boolean DEFAULT true
);


ALTER TABLE public.ownership OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16466)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    email character varying(254) NOT NULL,
    password character varying(30),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16465)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5058 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4875 (class 2604 OID 16469)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5048 (class 0 OID 16494)
-- Dependencies: 223
-- Data for Name: analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.analytics (id, website_url, ping5, checked_at) FROM stdin;
1	kiranpaudel.info.np	222	2025-12-28 15:50:23.221769
\.


--
-- TOC entry 5052 (class 0 OID 16522)
-- Dependencies: 227
-- Data for Name: average_day; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.average_day (id, website_url, avg, checked_at) FROM stdin;
\.


--
-- TOC entry 5050 (class 0 OID 16508)
-- Dependencies: 225
-- Data for Name: average_hr; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.average_hr (id, website_url, avg, checked_at) FROM stdin;
\.


--
-- TOC entry 5046 (class 0 OID 16478)
-- Dependencies: 221
-- Data for Name: ownership; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ownership (website_url, owner_email, is_public) FROM stdin;
kiranpaudel.info.np	kiran@gmail.com	t
\.


--
-- TOC entry 5045 (class 0 OID 16466)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, created_at) FROM stdin;
1	kiran	kiran@gmail.com	kiran122	2025-12-28 15:38:39.488294
\.


--
-- TOC entry 5059 (class 0 OID 0)
-- Dependencies: 222
-- Name: analytics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.analytics_id_seq', 1, true);


--
-- TOC entry 5060 (class 0 OID 0)
-- Dependencies: 226
-- Name: average_day_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.average_day_id_seq', 1, false);


--
-- TOC entry 5061 (class 0 OID 0)
-- Dependencies: 224
-- Name: average_hr_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.average_hr_id_seq', 1, false);


--
-- TOC entry 5062 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- TOC entry 4888 (class 2606 OID 16501)
-- Name: analytics analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics
    ADD CONSTRAINT analytics_pkey PRIMARY KEY (id);


--
-- TOC entry 4892 (class 2606 OID 16529)
-- Name: average_day average_day_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.average_day
    ADD CONSTRAINT average_day_pkey PRIMARY KEY (id);


--
-- TOC entry 4890 (class 2606 OID 16515)
-- Name: average_hr average_hr_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.average_hr
    ADD CONSTRAINT average_hr_pkey PRIMARY KEY (id);


--
-- TOC entry 4886 (class 2606 OID 16487)
-- Name: ownership ownership_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ownership
    ADD CONSTRAINT ownership_pkey PRIMARY KEY (website_url);


--
-- TOC entry 4882 (class 2606 OID 16477)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4884 (class 2606 OID 16475)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4894 (class 2606 OID 16502)
-- Name: analytics analytics_website_url_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics
    ADD CONSTRAINT analytics_website_url_fkey FOREIGN KEY (website_url) REFERENCES public.ownership(website_url);


--
-- TOC entry 4896 (class 2606 OID 16530)
-- Name: average_day average_day_website_url_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.average_day
    ADD CONSTRAINT average_day_website_url_fkey FOREIGN KEY (website_url) REFERENCES public.ownership(website_url);


--
-- TOC entry 4895 (class 2606 OID 16516)
-- Name: average_hr average_hr_website_url_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.average_hr
    ADD CONSTRAINT average_hr_website_url_fkey FOREIGN KEY (website_url) REFERENCES public.ownership(website_url);


--
-- TOC entry 4893 (class 2606 OID 16488)
-- Name: ownership ownership_owner_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ownership
    ADD CONSTRAINT ownership_owner_email_fkey FOREIGN KEY (owner_email) REFERENCES public.users(email) ON DELETE CASCADE;


-- Completed on 2026-01-01 11:24:02

--
-- PostgreSQL database dump complete
--

\unrestrict 4nsr8cj4nF25Zb4DFonFOmFBO9yAtMtTP1JF2UUhGwMeXhCcn50T9kq0YuG6PSb

