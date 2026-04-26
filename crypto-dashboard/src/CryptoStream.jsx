import { useEffect, useMemo, useState } from "react";
import * as signalR from "@microsoft/signalr";
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import "./CryptoStream.css";

const HUB_URL = import.meta.env.VITE_SIGNALR_URL || "http://localhost:5283/marketHub";
const RANGE_OPTIONS = [
    { key: "second", label: "Segundo" },
    { key: "day", label: "Día" },
    { key: "week", label: "Semana" },
    { key: "year", label: "Año" },
];

function getWeekLabel(date) {
    const workingDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNumber = workingDate.getUTCDay() || 7;
    workingDate.setUTCDate(workingDate.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(workingDate.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((workingDate - yearStart) / 86400000) + 1) / 7);

    return `${workingDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

function getBucketKey(date, range) {
    if (range === "year") {
        return `${date.getFullYear()}`;
    }

    if (range === "week") {
        return getWeekLabel(date);
    }

    if (range === "day") {
        return date.toLocaleDateString();
    }

    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function getBucketLabel(date, range) {
    if (range === "year") {
        return `${date.getFullYear()}`;
    }

    if (range === "week") {
        return getWeekLabel(date);
    }

    if (range === "day") {
        return date.toLocaleDateString();
    }

    return date.toLocaleTimeString();
}

export default function CryptoStream() {
    const [trades, setTrades] = useState([]);
    const [connectionState, setConnectionState] = useState("Connecting");
    const [selectedRange, setSelectedRange] = useState("second");

    const chartData = useMemo(() => {
        const buckets = new Map();

        [...trades].reverse().forEach((trade) => {
            const tradeDate = new Date(trade.time);
            const bucketKey = getBucketKey(tradeDate, selectedRange);
            const bucket = buckets.get(bucketKey) || {
                time: getBucketLabel(tradeDate, selectedRange),
            };

            if (trade.symbol === "BTCUSDT") {
                bucket.btc = trade.price;
            }

            if (trade.symbol === "ETHUSDT") {
                bucket.eth = trade.price;
            }

            buckets.set(bucketKey, bucket);
        });

        return Array.from(buckets.values()).slice(-120);
    }, [trades, selectedRange]);

    const latestBtc = trades.find((trade) => trade.symbol === "BTCUSDT");
    const latestEth = trades.find((trade) => trade.symbol === "ETHUSDT");


    useEffect(() => {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL)
            .withAutomaticReconnect()
            .build();

        connection.onreconnecting(() => setConnectionState("Reconnecting"));
        connection.onreconnected(() => setConnectionState("Connected"));
        connection.onclose(() => setConnectionState("Disconnected"));

        connection.on("ReceiveUpdate", (update) => {
            setTrades((prev) => [{
                symbol: update.symbol,
                price: Number(update.price),
                quantity: Number(update.quantity),
                time: update.time,
            }, ...prev].slice(0, 80));
        });

        connection.start()
            .then(() => setConnectionState("Connected"))
            .catch((error) => {
                setConnectionState("Error");
                console.error("SignalR connection error:", error);
            });

        return () => {
            connection.stop();
        };
    }, []);

    return (
        <div className="stream-dashboard">
            <div className="stream-header">
                <h2>Crypto Live Stream</h2>
                <span className={`status-pill status-${connectionState.toLowerCase()}`}>
                    {connectionState}
                </span>
            </div>

            <div className="range-controls" role="tablist" aria-label="Time range">
                {RANGE_OPTIONS.map((option) => (
                    <button
                        key={option.key}
                        type="button"
                        className={`range-button ${selectedRange === option.key ? "active" : ""}`}
                        onClick={() => setSelectedRange(option.key)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <div className="metric-grid">
                <article className="metric-card btc">
                    <h3>BTCUSDT</h3>
                    <p>{latestBtc ? `$${latestBtc.price.toLocaleString()}` : "Waiting..."}</p>
                </article>
                <article className="metric-card eth">
                    <h3>ETHUSDT</h3>
                    <p>{latestEth ? `$${latestEth.price.toLocaleString()}` : "Waiting..."}</p>
                </article>
            </div>

            <div className="chart-card">
                <div className="chart-title-row">
                    <h3>Price chart</h3>
                    <span>{RANGE_OPTIONS.find((option) => option.key === selectedRange)?.label}</span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 10, right: 24, bottom: 10, left: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" minTickGap={36} />
                        <YAxis domain={["auto", "auto"]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="btc" name="BTC" stroke="#f7931a" dot={false} connectNulls />
                        <Line type="monotone" dataKey="eth" name="ETH" stroke="#3c9bd8" dot={false} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="table-card">
                <h3>Latest Trades</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Symbol</th>
                            <th>Price</th>
                            <th>Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trades.slice(0, 12).map((trade, index) => (
                            <tr key={`${trade.time}-${index}`}>
                                <td>{new Date(trade.time).toLocaleTimeString()}</td>
                                <td>{trade.symbol}</td>
                                <td>${trade.price.toLocaleString()}</td>
                                <td>{trade.quantity.toFixed(6)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}