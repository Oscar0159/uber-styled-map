import React, { useState, useEffect, useRef, memo } from "react";
import axios from "axios";
import { Wrapper, Status } from "@googlemaps/react-wrapper";
import Lottie, { LottieRef, LottieRefCurrentProps } from "lottie-react";
import { useRequest } from "ahooks";

import markerAnimation from "./assets/markerAnimation.json";

const defaultMapOptions: google.maps.MapOptions = {
  center: { lat: 25.035646, lng: 121.564123 },
  zoom: 17,
  disableDefaultUI: false,
  gestureHandling: "greedy",
};

const Marker = memo((options: google.maps.MarkerOptions) => {
  const [marker, setMarker] = React.useState<google.maps.Marker>();

  React.useEffect(() => {
    if (!marker) {
      setMarker(new google.maps.Marker());
    }

    // remove marker from map on unmount
    return () => {
      if (marker) {
        marker.setMap(null);
      }
    };
  }, [marker]);

  React.useEffect(() => {
    if (marker) {
      marker.setOptions(options);
    }
  }, [marker, options]);

  return null;
});

const render = (status: Status) => {
  if (status === Status.FAILURE) return <div>error</div>;
  return <div>loading</div>;
};

const MyMapComponent = memo(
  ({ setMap }: { setMap: (map: google.maps.Map) => void }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!ref.current) return;
      const map = new window.google.maps.Map(ref.current, defaultMapOptions);

      setMap(map);
    });

    return <div ref={ref} id="map" style={{ height: "100vh" }} />;
  }
);

const App = () => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(
    defaultMapOptions.center as google.maps.LatLngLiteral
  );

  const markerLottieDivRef = useRef<HTMLDivElement>(null);
  const markerLottieRef: LottieRef = useRef<LottieRefCurrentProps | null>(
    null
  ) as LottieRef;
  const positionPaperRef = useRef<HTMLDivElement>(null);

  const { data, error, loading, run, mutate } = useRequest(
    async (lat: number, lng: number) => {
      const result = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${
          import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        }&language=zh-TW`
      );
      console.log(result.data.results[0].formatted_address);
      return result.data.results[0].formatted_address;
    },
    {
      debounceWait: 3000,
      manual: true,
    }
  );

  const handleDragStart = () => {
    if (!markerLottieRef.current) return;
    markerLottieRef.current.playSegments([0, 24], true);
  };

  const handleDragEnd = () => {
    if (!markerLottieRef.current) return;
    markerLottieRef.current.playSegments([58, 82], true);
  };

  const handleCenterChanged = () => {
    mutate(undefined);
    const center = map?.getCenter();
    if (!center) return;
    setPosition({ lat: center.lat(), lng: center.lng() });  // this can be moved to handleDragEnd
    run(center.lat(), center.lng());
  };

  useEffect(() => {
    if (!map) return;

    // add event listeners
    const drgaStartListener = map.addListener("dragstart", handleDragStart);
    const drgaEndListener = map.addListener("dragend", handleDragEnd);
    const centerChangedListener = map.addListener(
      "center_changed",
      handleCenterChanged
    );

    // add overlay elements
    if (markerLottieDivRef.current) {
      map.controls[google.maps.ControlPosition.CENTER].push(
        markerLottieDivRef.current
      );
    }
    if (positionPaperRef.current) {
      map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(
        positionPaperRef.current
      );
    }

    // remove event listeners
    return () => {
      drgaStartListener.remove();
      drgaEndListener.remove();
      centerChangedListener.remove();
    };
  }, [map]);

  return (
    <>
      <Wrapper
        apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        render={render}
      >
        <div id="map-container" style={{ position: "relative" }}>
          {/* map */}
          <MyMapComponent setMap={setMap} />

          {/* overlay elements */}
          {map ? (
            <>
              {/* overlay marker */}
              <div ref={markerLottieDivRef}>
                <Lottie
                  lottieRef={markerLottieRef}
                  loop={false}
                  autoPlay={false}
                  animationData={markerAnimation}
                  onDOMLoaded={() => {
                    markerLottieRef.current?.stop();
                  }}
                  style={{
                    position: "absolute",
                    width: "150px",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-82%)",
                    pointerEvents: "none",
                  }}
                />
              </div>

              {/* overlay paper for showing the position */}
              <div
                ref={positionPaperRef}
                style={{
                  position: "absolute",
                  padding: "10px",
                  width: "350px",
                  bottom: "0%",
                  left: "50%",
                  borderRadius: "10px",
                  backgroundColor: "white",
                  boxShadow: "0px 0px 5px 0px rgba(0,0,0,0.75)",
                }}
              >
                {position ? (
                  // text horizontal centering
                  <div
                    style={{
                      fontSize: "24px",
                    }}
                  >
                    lat: {position.lat.toString()}
                    <br />
                    lng: {position.lng.toString()}
                    <br />
                    address: {data}
                    <br />
                    loading address: {loading ? "true" : "false"}
                    <br />
                    error: {error?.toString()}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        {/* for check overlay marker is at the correct position */}
        <Marker position={position} map={map} />
      </Wrapper>
    </>
  );
};

export default App;
