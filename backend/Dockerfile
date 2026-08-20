# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM golang:1.24-alpine AS build
ARG TARGETOS
ARG TARGETARCH
WORKDIR /src
COPY go.mod ./
COPY *.go ./
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -trimpath -ldflags="-s -w" -o /out/backend .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/backend /backend
EXPOSE 8080
ENTRYPOINT ["/backend"]
