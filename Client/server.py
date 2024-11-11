from flask import Flask, jsonify
from flask_cors import CORS
import speedtest
import logging

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging to print errors
logging.basicConfig(level=logging.DEBUG)

def measure_download_speed():
    """Measures internet download speed."""
    try:
        test = speedtest.Speedtest()
        test.get_best_server()  # Select the best server based on latency
        download_speed = test.download() / 1_000_000  # Convert to Mbps
        return download_speed
    except Exception as e:
        logging.error(f"Download speed measurement failed: {e}")
        raise

def measure_upload_ping():
    """Measures internet upload speed and ping."""
    try:
        test = speedtest.Speedtest()
        test.get_best_server()  # Select the best server based on latency
        upload_speed = test.upload() / 1_000_000  # Convert to Mbps
        ping = test.results.ping  # Ping in milliseconds
        return upload_speed, ping
    except Exception as e:
        logging.error(f"Upload/Ping measurement failed: {e}")
        raise

@app.route('/api/speedtest/download', methods=['GET'])
def download_speed():
    try:
        download_speed_mbps = measure_download_speed()
        return jsonify({'download': download_speed_mbps})
    except Exception as e:
        logging.error("Download speed measurement failed:", exc_info=e)
        return jsonify({'error': 'Download speed measurement failed'}), 500

@app.route("/api/speedtest/upload_ping", methods=["GET"])
def upload_ping():
    try:
        upload_speed, ping = measure_upload_ping()
        return jsonify({"upload": upload_speed, "ping": ping})
    except Exception as e:
        logging.error(f"Error in /api/speedtest/upload_ping: {e}")
        return jsonify({"error": "Failed to measure upload speed and ping"}), 500

if __name__ == "__main__":
    app.run(debug=True)
