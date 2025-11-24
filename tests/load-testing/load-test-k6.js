// k6 Load Testing Script untuk Project Management System
// Install k6: https://k6.io/docs/getting-started/installation/

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const responseTime = new Trend("response_time");

// Test configuration
export const options = {
  stages: [
    { duration: "2m", target: 100 }, // Ramp up to 100 users
    { duration: "5m", target: 500 }, // Stay at 500 users
    { duration: "2m", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"], // 95% of requests should be below 1s
    errors: ["rate<0.01"], // Error rate should be less than 1%
  },
};

const BASE_URL = "https://your-project-management-system.com"; // Ganti dengan URL sistem Anda

export default function () {
  // Test various endpoints
  const endpoints = [
    "/api/projects",
    "/api/users",
    "/api/dashboard",
    "/api/tasks",
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  const response = http.get(`${BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      // Add authentication headers if needed
      // 'Authorization': 'Bearer YOUR_TOKEN',
    },
  });

  const result = check(response, {
    "status is 200": (r) => r.status === 200,
    "response time < 1000ms": (r) => r.timings.duration < 1000,
  });

  errorRate.add(!result);
  responseTime.add(response.timings.duration);

  sleep(1); // 1 second between requests per user
}

// Setup function (optional)
export function setup() {
  // Perform authentication or setup here
  // Return data that can be used in default function
  return { token: "your-auth-token" };
}
