/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { socket } from "@/socket";
import { Box, Button, Modal, TextField } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import React, { useRef, useEffect } from "react";
import OrderModal from "../../modal/OrderModal";
import { useAppSelector } from "@/redux/hooks";
import { RootState } from "@/redux/store";
import useStaff from "@/controllers/useStaff";

type Table = {
  id: number;
  name: string;
  capacity: number;
  restaurantId: number;
  position: string;
  orderId: number | null;
};

const ListTable = () => {
  const [open, setOpen] = React.useState(false);
  const [open2, setOpen2] = React.useState(false);
  const [orderId, setOrderId] = React.useState(0);
  const [tables, setTables] = React.useState<Table[]>([]);
  const [filterText, setFilterText] = React.useState(""); // State để lưu giá trị nhập liệu
  const [highlightedTable, setHighlightedTable] = React.useState<number | null>(
    null
  ); // State để lưu id của bàn được highlight
  const { restaurantId } = useAppSelector((state: RootState) => state.profile);
  const handleOpen = (orderId: number | null) => {
    if (orderId === 0) {
      setOpen(true);
      return;
    }
    setOrderId(orderId || 0);
    setOpen2(true);
  };
  const { getAllTablesByRestaurantId } = useStaff();

  useEffect(() => {
    const getAllTables = async () => {
      const response = await getAllTablesByRestaurantId({
        restaurantId: restaurantId,
      });
      console.log("🚀 ~ getAllTables ~ response:", response);
      if (response.status !== 200) {
        return;
      }
      let tmp: Table[] = [];
      response.data.forEach((table: any) => {
        tmp.push({
          id: table.id,
          name: table.name,
          capacity: table.capacity,
          restaurantId: table.restaurantId,
          position: table.position,
          orderId: table.orderId,
        });
      });
      setTables(tmp);
    };
    getAllTables();
  }, [restaurantId]);

  useEffect(() => {
    socket.on("free-table", (data) => {
      if (data === "success") {
        const getAllTables = async () => {
          const response = await getAllTablesByRestaurantId({
            restaurantId: restaurantId,
          });
          console.log("🚀 ~ getAllTables ~ response:", response);
          if (response.status !== 200) {
            return;
          }
          let tmp: Table[] = [];
          response.data.forEach((table: any) => {
            tmp.push({
              id: table.id,
              name: table.name,
              capacity: table.capacity,
              restaurantId: table.restaurantId,
              position: table.position,
              orderId: table.orderId,
            });
          });
          setTables(tmp);
        };
        getAllTables();
      }
    });
    return () => {};
  }, [socket]);

  const handleClose = () => setOpen(false);

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(event.target.value);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      const table = tables.find(
        (table) => table.name.toLowerCase() === filterText.toLowerCase()
      );
      if (table) {
        setHighlightedTable(table.id);
        const tableElement = document.getElementById(`table-${table.id}`);
        if (tableElement) {
          tableElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        setHighlightedTable(null);
      }
    }
  };

  return (
    <Box
      sx={{
        marginBottom: "0px",
      }}
    >
      <TextField
        label="Search table"
        value={filterText}
        onChange={handleFilterChange}
        onKeyPress={handleKeyPress}
        fullWidth
        margin="normal"
      />
      <Grid container spacing={2}>
        {tables.map((table) => (
          <Grid
            xs={12}
            sm={6}
            md={4}
            lg={3}
            key={table.id}
            id={`table-${table.id}`}
          >
            <Button
              variant="outlined"
              sx={{
                width: "100%",
                height: "100px",
                fontSize: "1.5rem",
                textTransform: "none",
                color: table.orderId === 0 ? "#000" : "#fff",
                backgroundColor: table.orderId === 0 ? "#fff" : "#539BFF",
                "&:hover": {
                  backgroundColor: "#e46e6e",
                  color: "#fff",
                },
                border:
                  highlightedTable === table.id ? "2px solid red" : undefined, // Tạo viền đỏ nếu là bàn được highlight
              }}
              onClick={() => handleOpen(table.orderId)}
            >
              {table.name}
            </Button>
          </Grid>
        ))}
      </Grid>
      <Modal open={open} onClose={handleClose}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "40%",
            height: "60%",
            backgroundColor: "#fff",
            border: "2px solid #000",
            padding: "20px",
            borderRadius: "10px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          No order
        </Box>
      </Modal>
      <OrderModal
        open={open2}
        onClose={() => setOpen2(false)}
        orderId={orderId}
      />
    </Box>
  );
};

export default ListTable;
