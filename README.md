# Singapore Carpark Availability Data Pipeline
An end-to-end data engineering project ran on GCP that collects real-time Singapore carpark availability data, processes and enriches it using SQL Joins, and serves the latest information through a frontend UI.

## Project Overview
This project uses Singapore's open government data to build a pipeline that:
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
The python code used to ingest data from the api is [here](https://github.com/gangaaram/carpark-availability-pipeline/blob/main/python-ingest/). A Cloud Scheduler job triggers the ingestion service every minute. The python ingestion service then:
1) Calls the carpark availability API
2) Extracts carpark and lot availability information
3) Adds an ingestion_timestamp
4) Loads the data into BigQuery

### Data Storage
The data is stored in BigQuery using two main tables and merged on carpark_number=car_park_no to get coordinate and address details.
<img width="948" height="422" alt="image" src="https://github.com/user-attachments/assets/5c60fb9d-7ecb-4881-a4f9-a0707673409b" />

### BigQuery Partitioning
Because the pipeline collects data every minute, storing all historical snapshots indefinitely would cause the dataset to grow rapidly. To manage storage and query costs, the availability data is partitioned using ingestion_timestamp and by every hour. After 1 hour, the previous hour's data will be deleted.<p>

This allows the application to maintain recent availability data while keeping the cloud infrastructure cost-efficient.

```sql
CREATE TABLE `radiant-clone-480213-i6.Carpark.carpark_availability`
(
  carpark_number STRING,
  update_datetime STRING,
  lot_type STRING,
  lots_available INT64,
  total_lots INT64,
  ingestion_timestamp TIMESTAMP
)
PARTITION BY TIMESTAMP_TRUNC(ingestion_timestamp, HOUR)
OPTIONS (
  partition_expiration_days = 0.0416667
);
```
### Retrieving the Latest Availability

The code used in the frontend to retrieve data from BigQuery is [here](https://github.com/gangaaram/carapark-availability-pipeline/blob/main/python-get-data.py/).

### Frontend UI

The processed data is exposed through the backend API above and displayed using Leaflet and Vite. The application provides: 
1) Interactive Singapore Map
2) Current carpark availability
3) Availability Classification
4) Address-based searches
5) Postal-code searches with the help of OneMap API. Refer [here] <p>

The carparks are categories based on the proportion of available lots. High if >50%, Medium if 20 to 50% and Low if <20%. They are also colour coded with green as high, yellow as medium and red as low. <p>
<img width="70%" height="70%" alt="image" src="https://github.com/user-attachments/assets/d994c1e8-bc4d-40e7-a841-50a16ed93fad" />

### Google Cloud Platform
This project uses Google Cloud IAM and service accounts to manage access to cloud run functions. Services such as the retrieve 


