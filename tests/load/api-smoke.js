import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  insecureSkipTLSVerify: true,
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

export default function () {
  const response = http.get(`${__ENV.BASE_URL || "https://localhost"}/health`);
  check(response, { "health 200": (result) => result.status === 200 });
  sleep(1);
}
