import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TruckingGastosAutoridadesUpload } from "./trucking-gastos-autoridades-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { 
  fetchAutoridadesRecords, 
  deleteAutoridadesRecord, 
  selectAutoridadesRecords,
  selectRecordsLoading,
  selectRecordsError 
} from "@/lib/features/records/recordsSlice";

export function TruckingGastosAutoridadesPage() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState("upload");
  
  const records = useAppSelector(selectAutoridadesRecords);
  const loading = useAppSelector(selectRecordsLoading);
  const error = useAppSelector(selectRecordsError);

  useEffect(() => {
    if (tab === "list") {
      dispatch(fetchAutoridadesRecords());
    }
  }, [tab, dispatch]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar este registro?")) return;
    try {
      await dispatch(deleteAutoridadesRecord(id)).unwrap();
      toast({ title: "Registro eliminado" });
    } catch (e: any) {
      toast({ title: "Error al eliminar", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="upload">Subir Gastos Autoridades</TabsTrigger>
        <TabsTrigger value="list">Ver Registros Cargados</TabsTrigger>
      </TabsList>
      <TabsContent value="upload">
        <TruckingGastosAutoridadesUpload />
      </TabsContent>
      <TabsContent value="list">
        <Card>
          <CardHeader>
            <CardTitle>Registros de Gastos Autoridades</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto max-h-[70vh]">
            {loading ? (
              <div className="p-8 text-center">Cargando…</div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No hay registros cargados.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Auth</TableHead>
                    <TableHead>Container</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Total Weight</TableHead>
                    <TableHead>Transport</TableHead>
                    <TableHead>F/E</TableHead>
                    <TableHead>POL</TableHead>
                    <TableHead>POD</TableHead>
                    <TableHead>BL Number</TableHead>
                    <TableHead>Notf.</TableHead>
                    <TableHead>Seal</TableHead>
                    <TableHead>From Vsl/Voy</TableHead>
                    <TableHead>Commodity</TableHead>
                    <TableHead># TRAMITE</TableHead>
                    <TableHead>RUTA</TableHead>
                    <TableHead>Date of Invoice</TableHead>
                    <TableHead>NO. INVOICE</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((row) => (
                    <TableRow key={row._id}>
                      <TableCell>{row.order}</TableCell>
                      <TableCell>{row.auth}</TableCell>
                      <TableCell>{row.container}</TableCell>
                      <TableCell>{row.size}</TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>{row.totalWeight}</TableCell>
                      <TableCell>{row.transport}</TableCell>
                      <TableCell>{row.fe}</TableCell>
                      <TableCell>{row.pol}</TableCell>
                      <TableCell>{row.pod}</TableCell>
                      <TableCell>{row.blNumber}</TableCell>
                      <TableCell>{row.notf}</TableCell>
                      <TableCell>{row.seal}</TableCell>
                      <TableCell>{row.fromVslVoy}</TableCell>
                      <TableCell>{row.commodity}</TableCell>
                      <TableCell>{row.tramite}</TableCell>
                      <TableCell>{row.ruta}</TableCell>
                      <TableCell>{row.dateOfInvoice ? new Date(row.dateOfInvoice).toLocaleDateString() : ''}</TableCell>
                      <TableCell>{row.noInvoice}</TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(row._id)} className="text-red-600">Eliminar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}


