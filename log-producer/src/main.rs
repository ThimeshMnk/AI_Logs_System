use rdkafka::config::ClientConfig;
use rdkafka::producer::{FutureProducer, FutureRecord};
use serde::Serialize;
use chrono::Utc;
use rand::Rng;
use std::time::Duration;

#[derive(Serialize)]
struct LogEntry {
    timestamp: String,
    ip_address: String,
    method: String,
    path: String,
    status: u16,
    response_time_ms: u64,
}

fn generate_ip() -> String {
    let mut rng = rand::rng(); 
    format!("{}.{}.{}.{}", 
        rng.random::<u8>(), 
        rng.random::<u8>(), 
        rng.random::<u8>(), 
        rng.random::<u8>()
    )
}

#[tokio::main] 
async fn main() {
    let producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", "localhost:9092")
        .set("message.timeout.ms", "5000")
        .create()
        .expect("Producer creation error");

    println!("Log Producer started. Sending logs to Redpanda...");

   loop {
        let mut rng = rand::rng();
        
        let is_anomaly = rng.random_bool(0.05); 

        let log = if is_anomaly {
            LogEntry {
                timestamp: Utc::now().to_rfc3339(),
                ip_address: "99.99.99.99".to_string(),
                method: "POST".to_string(),
                path: "/admin/upload".to_string(),
                status: 500,
                response_time_ms: 5000, 
            }
        } else {
            LogEntry {
                timestamp: Utc::now().to_rfc3339(),
                ip_address: generate_ip(),
                method: "GET".to_string(),
                path: "/api/v1/resource".to_string(),
                status: 200,
                response_time_ms: rng.random_range(10..150),
            }
        };

        let payload = serde_json::to_string(&log).unwrap();
        let record = FutureRecord::to("network-logs")
            .payload(&payload)
            .key(&log.ip_address);

        let _ = producer.send(record, Duration::from_secs(0)).await;

        tokio::time::sleep(Duration::from_millis(100)).await;
    }
}