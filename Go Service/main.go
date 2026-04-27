package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/websocket"
)

type binanceStreamMessage struct {
	Stream string `json:"stream"`
	Data   struct {
		Symbol   string `json:"s"`
		Price    string `json:"p"`
		Quantity string `json:"q"`
		Time     int64  `json:"T"`
	} `json:"data"`
}

type marketUpdate struct {
	Symbol   string    `json:"symbol"`
	Price    float64   `json:"price"`
	Quantity float64   `json:"quantity"`
	Time     time.Time `json:"time"`
}

func main() {
	url := "wss://stream.binance.com:9443/stream?streams=btcusdt@trade/ethusdt@trade"
	conn, _, err := websocket.DefaultDialer.Dial(url, nil)

	// Fall back to the default dialer if the custom dialer fails
	if err != nil {
		log.Fatal("Error connecting to WebSocket:", err)
	}
	defer conn.Close()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Fatal("Error reading message:", err)
			return
		}

		var streamMessage binanceStreamMessage
		if err := json.Unmarshal(message, &streamMessage); err != nil {
			log.Println("Error parsing message:", err)
			continue
		}

		payload := marketUpdate{
			Symbol: streamMessage.Data.Symbol,
			Time:   time.UnixMilli(streamMessage.Data.Time),
		}

		price, err := strconv.ParseFloat(streamMessage.Data.Price, 64)
		if err != nil {
			log.Println("Error parsing price:", err)
			continue
		}

		quantity, err := strconv.ParseFloat(streamMessage.Data.Quantity, 64)
		if err != nil {
			log.Println("Error parsing quantity:", err)
			continue
		}

		payload.Price = price
		payload.Quantity = quantity

		body, err := json.Marshal(payload)
		if err != nil {
			log.Println("Error marshaling update:", err)
			continue
		}

		resp, err := http.Post("http://localhost:5283/api/market", "application/json", bytes.NewReader(body))
		if err != nil {
			log.Println("Error sending update to .NET:", err)
			continue
		}

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			responseBody, _ := io.ReadAll(resp.Body)
			_ = resp.Body.Close()
			log.Printf(".NET API returned %d: %s", resp.StatusCode, string(responseBody))
			continue
		}

		_ = resp.Body.Close()

		fmt.Printf("forwarded %s %.8f %.8f\n", payload.Symbol, payload.Price, payload.Quantity)
	}
}
