# Singapore Carpark Availability Data Pipeline
An end-to-end data engineering project ran on GCP that collects real-time Singapore carpark availability data, processes and enriches it using SQL Joins, and serves the latest information through a frontend UI.

## Project Overview
This project uses Singapore's open govenment data to build a pipeline that:
1) Retrieves real-time carpark availability data from the data.gov.sg API
2) Ingests the data into BigQuery through Python Code ran on Cloud Run Functions
3) Stores availability snapshots in batches that refresh every 1 minute
4) Enriches availability data with static carpark information
5) Exposes the processed data through an API
6) Displays the results on an interactive map using React and Leaflet

## Architecture
<img width="70%" height="70%" alt="image" src="https://github.com/user-attachments/assets/9e0f9e4a-c894-4586-bf10-270c7b6e239b" />

## Tools
GCP products (Cloud Run, Scheduler, BigQuery) <p>
Python for Data Ingestion, SQL for JOINS and PARTITION <p>
Leaflet.js for Map Visualisation <p>
APIs used: [OneMap API](https://www.onemap.gov.sg/apidocs/), [data.gov.sg API](https://data.gov.sg/datasets/d_ca933a644e55d34fe21f28b8052fac63/view/)

## Data Pipeline
### Data Ingestion
The python code used to ingest data from the api is here 

