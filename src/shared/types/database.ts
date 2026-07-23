export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      almacenes: {
        Row: {
          activo: boolean | null
          almacen_id: number
          direccion: string | null
          nombre: string
        }
        Insert: {
          activo?: boolean | null
          almacen_id?: number
          direccion?: string | null
          nombre: string
        }
        Update: {
          activo?: boolean | null
          almacen_id?: number
          direccion?: string | null
          nombre?: string
        }
        Relationships: []
      }
      cancelacionesautorizadas: {
        Row: {
          cajero_id: number
          cancelacion_id: number
          cantidad_cancelada: number
          detalle_venta_id_original: number | null
          fecha_hora: string | null
          importe_cancelado: number
          motivo: string | null
          producto_id: number
          supervisor_id: number
          venta_id: number
        }
        Insert: {
          cajero_id: number
          cancelacion_id?: number
          cantidad_cancelada: number
          detalle_venta_id_original?: number | null
          fecha_hora?: string | null
          importe_cancelado: number
          motivo?: string | null
          producto_id: number
          supervisor_id: number
          venta_id: number
        }
        Update: {
          cajero_id?: number
          cancelacion_id?: number
          cantidad_cancelada?: number
          detalle_venta_id_original?: number | null
          fecha_hora?: string | null
          importe_cancelado?: number
          motivo?: string | null
          producto_id?: number
          supervisor_id?: number
          venta_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_canc_cajero"
            columns: ["cajero_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["empleado_id"]
          },
          {
            foreignKeyName: "fk_canc_producto"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "fk_canc_supervisor"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["empleado_id"]
          },
          {
            foreignKeyName: "fk_canc_venta"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["venta_id"]
          },
        ]
      }
      clientes: {
        Row: {
          activo: boolean | null
          cliente_id: number
          direccion: string | null
          email: string | null
          fecha_registro: string | null
          limite_credito: number | null
          nombre: string
          permite_credito: boolean | null
          rfc: string | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean | null
          cliente_id?: number
          direccion?: string | null
          email?: string | null
          fecha_registro?: string | null
          limite_credito?: number | null
          nombre: string
          permite_credito?: boolean | null
          rfc?: string | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean | null
          cliente_id?: number
          direccion?: string | null
          email?: string | null
          fecha_registro?: string | null
          limite_credito?: number | null
          nombre?: string
          permite_credito?: boolean | null
          rfc?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      cortescaja: {
        Row: {
          corte_id: number
          diferencia: number | null
          empleado_id: number
          fecha_hora_apertura: string
          fecha_hora_cierre: string | null
          notas: string | null
          saldo_final_real: number | null
          saldo_final_teorico: number | null
          saldo_inicial_efectivo: number
          terminal_id: string | null
          total_devoluciones_tarjeta: number | null
          total_entradas_efectivo: number | null
          total_otros_pagos: number | null
          total_salidas_efectivo: number | null
          total_ventas_credito: number | null
          total_ventas_efectivo: number | null
          total_ventas_tarjeta: number | null
        }
        Insert: {
          corte_id?: number
          diferencia?: number | null
          empleado_id: number
          fecha_hora_apertura: string
          fecha_hora_cierre?: string | null
          notas?: string | null
          saldo_final_real?: number | null
          saldo_final_teorico?: number | null
          saldo_inicial_efectivo: number
          terminal_id?: string | null
          total_devoluciones_tarjeta?: number | null
          total_entradas_efectivo?: number | null
          total_otros_pagos?: number | null
          total_salidas_efectivo?: number | null
          total_ventas_credito?: number | null
          total_ventas_efectivo?: number | null
          total_ventas_tarjeta?: number | null
        }
        Update: {
          corte_id?: number
          diferencia?: number | null
          empleado_id?: number
          fecha_hora_apertura?: string
          fecha_hora_cierre?: string | null
          notas?: string | null
          saldo_final_real?: number | null
          saldo_final_teorico?: number | null
          saldo_inicial_efectivo?: number
          terminal_id?: string | null
          total_devoluciones_tarjeta?: number | null
          total_entradas_efectivo?: number | null
          total_otros_pagos?: number | null
          total_salidas_efectivo?: number | null
          total_ventas_credito?: number | null
          total_ventas_efectivo?: number | null
          total_ventas_tarjeta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_empleado_corte"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["empleado_id"]
          },
        ]
      }
      departamentos: {
        Row: {
          activo: boolean | null
          departamento_id: number
          descripcion: string | null
          fecha_creacion: string | null
          nombre: string
          promocion_id: number | null
        }
        Insert: {
          activo?: boolean | null
          departamento_id?: number
          descripcion?: string | null
          fecha_creacion?: string | null
          nombre: string
          promocion_id?: number | null
        }
        Update: {
          activo?: boolean | null
          departamento_id?: number
          descripcion?: string | null
          fecha_creacion?: string | null
          nombre?: string
          promocion_id?: number | null
        }
        Relationships: []
      }
      detalleventa: {
        Row: {
          cantidad: number
          descripcion_registrada: string
          descuento_aplicado: number | null
          detalle_venta_id: number
          importe_total: number
          impuesto_aplicado: number
          precio_unitario_registrado: number
          producto_id: number
          promocion_id: number | null
          venta_id: number
        }
        Insert: {
          cantidad: number
          descripcion_registrada: string
          descuento_aplicado?: number | null
          detalle_venta_id?: number
          importe_total: number
          impuesto_aplicado: number
          precio_unitario_registrado: number
          producto_id: number
          promocion_id?: number | null
          venta_id: number
        }
        Update: {
          cantidad?: number
          descripcion_registrada?: string
          descuento_aplicado?: number | null
          detalle_venta_id?: number
          importe_total?: number
          impuesto_aplicado?: number
          precio_unitario_registrado?: number
          producto_id?: number
          promocion_id?: number | null
          venta_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_producto_detalle"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "fk_venta_detalle"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["venta_id"]
          },
        ]
      }
      empleados: {
        Row: {
          activo: boolean | null
          auth_user_id: string | null
          contrasena_hash: string | null
          email: string | null
          empleado_id: number
          fecha_contratacion: string | null
          nombre_completo: string
          rol_id: number
          usuario: string
        }
        Insert: {
          activo?: boolean | null
          auth_user_id?: string | null
          contrasena_hash?: string | null
          email?: string | null
          empleado_id?: number
          fecha_contratacion?: string | null
          nombre_completo: string
          rol_id: number
          usuario: string
        }
        Update: {
          activo?: boolean | null
          auth_user_id?: string | null
          contrasena_hash?: string | null
          email?: string | null
          empleado_id?: number
          fecha_contratacion?: string | null
          nombre_completo?: string
          rol_id?: number
          usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_rol"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["rol_id"]
          },
        ]
      }
      inventario: {
        Row: {
          almacen_id: number
          cantidad_actual: number
          producto_id: number
          stock_maximo: number | null
          stock_minimo: number | null
          ultima_actualizacion: string | null
        }
        Insert: {
          almacen_id: number
          cantidad_actual?: number
          producto_id: number
          stock_maximo?: number | null
          stock_minimo?: number | null
          ultima_actualizacion?: string | null
        }
        Update: {
          almacen_id?: number
          cantidad_actual?: number
          producto_id?: number
          stock_maximo?: number | null
          stock_minimo?: number | null
          ultima_actualizacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_almacen_stock"
            columns: ["almacen_id"]
            isOneToOne: false
            referencedRelation: "almacenes"
            referencedColumns: ["almacen_id"]
          },
          {
            foreignKeyName: "fk_producto_stock"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      metodospago: {
        Row: {
          activo: boolean | null
          metodo_pago_id: number
          nombre: string
          requiere_referencia: boolean | null
        }
        Insert: {
          activo?: boolean | null
          metodo_pago_id?: number
          nombre: string
          requiere_referencia?: boolean | null
        }
        Update: {
          activo?: boolean | null
          metodo_pago_id?: number
          nombre?: string
          requiere_referencia?: boolean | null
        }
        Relationships: []
      }
      movimientoscuentacliente: {
        Row: {
          cliente_id: number
          empleado_id: number
          fecha_hora: string | null
          monto: number
          movimiento_cuenta_id: number
          notas: string | null
          referencia_id: number | null
          referencia_tabla: string | null
          saldo_anterior: number | null
          saldo_nuevo: number | null
          tipo_movimiento: string
        }
        Insert: {
          cliente_id: number
          empleado_id: number
          fecha_hora?: string | null
          monto: number
          movimiento_cuenta_id?: number
          notas?: string | null
          referencia_id?: number | null
          referencia_tabla?: string | null
          saldo_anterior?: number | null
          saldo_nuevo?: number | null
          tipo_movimiento: string
        }
        Update: {
          cliente_id?: number
          empleado_id?: number
          fecha_hora?: string | null
          monto?: number
          movimiento_cuenta_id?: number
          notas?: string | null
          referencia_id?: number | null
          referencia_tabla?: string | null
          saldo_anterior?: number | null
          saldo_nuevo?: number | null
          tipo_movimiento?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cliente_mov_cta"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "fk_empleado_mov_cta"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["empleado_id"]
          },
        ]
      }
      movimientosinventario: {
        Row: {
          almacen_id: number
          cantidad: number
          empleado_id: number | null
          fecha_hora: string | null
          movimiento_id: number
          notas: string | null
          producto_id: number
          referencia_id: number | null
          referencia_tabla: string | null
          tipo_movimiento_id: number
        }
        Insert: {
          almacen_id: number
          cantidad: number
          empleado_id?: number | null
          fecha_hora?: string | null
          movimiento_id?: number
          notas?: string | null
          producto_id: number
          referencia_id?: number | null
          referencia_tabla?: string | null
          tipo_movimiento_id: number
        }
        Update: {
          almacen_id?: number
          cantidad?: number
          empleado_id?: number | null
          fecha_hora?: string | null
          movimiento_id?: number
          notas?: string | null
          producto_id?: number
          referencia_id?: number | null
          referencia_tabla?: string | null
          tipo_movimiento_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_almacen_mov"
            columns: ["almacen_id"]
            isOneToOne: false
            referencedRelation: "almacenes"
            referencedColumns: ["almacen_id"]
          },
          {
            foreignKeyName: "fk_empleado_mov"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["empleado_id"]
          },
          {
            foreignKeyName: "fk_producto_mov"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "fk_tipo_mov"
            columns: ["tipo_movimiento_id"]
            isOneToOne: false
            referencedRelation: "tiposmovimientoinventario"
            referencedColumns: ["tipo_movimiento_id"]
          },
        ]
      }
      pagos: {
        Row: {
          fecha_hora: string | null
          metodo_pago_id: number
          monto: number
          pago_id: number
          referencia_pago: string | null
          venta_id: number
        }
        Insert: {
          fecha_hora?: string | null
          metodo_pago_id: number
          monto: number
          pago_id?: number
          referencia_pago?: string | null
          venta_id: number
        }
        Update: {
          fecha_hora?: string | null
          metodo_pago_id?: number
          monto?: number
          pago_id?: number
          referencia_pago?: string | null
          venta_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_metodo_pago"
            columns: ["metodo_pago_id"]
            isOneToOne: false
            referencedRelation: "metodospago"
            referencedColumns: ["metodo_pago_id"]
          },
          {
            foreignKeyName: "fk_venta_pago"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["venta_id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean | null
          codigo_alterno: string | null
          codigo_barras: string | null
          departamento_id: number
          descripcion: string
          descripcion_larga: string | null
          fecha_creacion: string | null
          imagen_url: string | null
          impuesto_porcentaje: number | null
          maneja_caducidad: boolean
          maneja_inventario: boolean
          precio_costo: number
          precio_editable: boolean
          precio_mayoreo: number | null
          precio_venta: number
          producto_id: number
          promocion_id: number | null
          proveedor_id: number | null
          tipo_producto: string
          unidad_medida: string
        }
        Insert: {
          activo?: boolean | null
          codigo_alterno?: string | null
          codigo_barras?: string | null
          departamento_id: number
          descripcion: string
          descripcion_larga?: string | null
          fecha_creacion?: string | null
          imagen_url?: string | null
          impuesto_porcentaje?: number | null
          maneja_caducidad?: boolean
          maneja_inventario?: boolean
          precio_costo?: number
          precio_editable?: boolean
          precio_mayoreo?: number | null
          precio_venta: number
          producto_id?: number
          promocion_id?: number | null
          proveedor_id?: number | null
          tipo_producto: string
          unidad_medida?: string
        }
        Update: {
          activo?: boolean | null
          codigo_alterno?: string | null
          codigo_barras?: string | null
          departamento_id?: number
          descripcion?: string
          descripcion_larga?: string | null
          fecha_creacion?: string | null
          imagen_url?: string | null
          impuesto_porcentaje?: number | null
          maneja_caducidad?: boolean
          maneja_inventario?: boolean
          precio_costo?: number
          precio_editable?: boolean
          precio_mayoreo?: number | null
          precio_venta?: number
          producto_id?: number
          promocion_id?: number | null
          proveedor_id?: number | null
          tipo_producto?: string
          unidad_medida?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_departamento"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["departamento_id"]
          },
          {
            foreignKeyName: "fk_promocion"
            columns: ["promocion_id"]
            isOneToOne: false
            referencedRelation: "promociones"
            referencedColumns: ["promocion_id"]
          },
          {
            foreignKeyName: "fk_proveedor"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["proveedor_id"]
          },
        ]
      }
      promocion_reglas: {
        Row: {
          cantidad_requerida: number | null
          porcentaje_descuento: number | null
          producto_activador_id: number | null
          producto_beneficio_id: number | null
          promocion_id: number
          regla_id: number
        }
        Insert: {
          cantidad_requerida?: number | null
          porcentaje_descuento?: number | null
          producto_activador_id?: number | null
          producto_beneficio_id?: number | null
          promocion_id: number
          regla_id?: number
        }
        Update: {
          cantidad_requerida?: number | null
          porcentaje_descuento?: number | null
          producto_activador_id?: number | null
          producto_beneficio_id?: number | null
          promocion_id?: number
          regla_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "promocion_reglas_producto_activador_id_fkey"
            columns: ["producto_activador_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "promocion_reglas_producto_beneficio_id_fkey"
            columns: ["producto_beneficio_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "promocion_reglas_promocion_id_fkey"
            columns: ["promocion_id"]
            isOneToOne: false
            referencedRelation: "promociones"
            referencedColumns: ["promocion_id"]
          },
        ]
      }
      promociones: {
        Row: {
          activo: boolean
          cantidad_pago: number | null
          descripcion: string | null
          fecha_fin: string | null
          fecha_inicio: string
          nombre: string
          precio_promocional: number | null
          promocion_id: number
          tipo_promocion: string
          valor: number | null
        }
        Insert: {
          activo?: boolean
          cantidad_pago?: number | null
          descripcion?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          nombre: string
          precio_promocional?: number | null
          promocion_id?: number
          tipo_promocion: string
          valor?: number | null
        }
        Update: {
          activo?: boolean
          cantidad_pago?: number | null
          descripcion?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          nombre?: string
          precio_promocional?: number | null
          promocion_id?: number
          tipo_promocion?: string
          valor?: number | null
        }
        Relationships: []
      }
      proveedores: {
        Row: {
          activo: boolean | null
          direccion: string | null
          email: string | null
          fecha_registro: string | null
          nombre_contacto: string | null
          nombre_empresa: string
          proveedor_id: number
          rfc: string | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean | null
          direccion?: string | null
          email?: string | null
          fecha_registro?: string | null
          nombre_contacto?: string | null
          nombre_empresa: string
          proveedor_id?: number
          rfc?: string | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean | null
          direccion?: string | null
          email?: string | null
          fecha_registro?: string | null
          nombre_contacto?: string | null
          nombre_empresa?: string
          proveedor_id?: number
          rfc?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          descripcion: string | null
          nombre_rol: string
          rol_id: number
        }
        Insert: {
          descripcion?: string | null
          nombre_rol: string
          rol_id?: number
        }
        Update: {
          descripcion?: string | null
          nombre_rol?: string
          rol_id?: number
        }
        Relationships: []
      }
      tickets: {
        Row: {
          actualizado_en: string
          carrito: Json
          corte_id: number
          creado_en: string
          empleado_id: number
          estado: string
          nombre: string | null
          terminal_id: string
          ticket_id: number
          venta_id: number | null
        }
        Insert: {
          actualizado_en?: string
          carrito?: Json
          corte_id: number
          creado_en?: string
          empleado_id: number
          estado?: string
          nombre?: string | null
          terminal_id: string
          ticket_id?: number
          venta_id?: number | null
        }
        Update: {
          actualizado_en?: string
          carrito?: Json
          corte_id?: number
          creado_en?: string
          empleado_id?: number
          estado?: string
          nombre?: string | null
          terminal_id?: string
          ticket_id?: number
          venta_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "cortescaja"
            referencedColumns: ["corte_id"]
          },
          {
            foreignKeyName: "tickets_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["empleado_id"]
          },
          {
            foreignKeyName: "tickets_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["venta_id"]
          },
        ]
      }
      tiposmovimientoinventario: {
        Row: {
          efecto: string
          nombre: string
          tipo_movimiento_id: number
        }
        Insert: {
          efecto: string
          nombre: string
          tipo_movimiento_id?: number
        }
        Update: {
          efecto?: string
          nombre?: string
          tipo_movimiento_id?: number
        }
        Relationships: []
      }
      ventas: {
        Row: {
          cliente_id: number | null
          corte_id: number | null
          descuento_total: number | null
          empleado_id: number
          estado: string | null
          fecha_hora: string | null
          impuestos: number
          subtotal: number
          total: number
          venta_id: number
        }
        Insert: {
          cliente_id?: number | null
          corte_id?: number | null
          descuento_total?: number | null
          empleado_id: number
          estado?: string | null
          fecha_hora?: string | null
          impuestos: number
          subtotal: number
          total: number
          venta_id?: number
        }
        Update: {
          cliente_id?: number | null
          corte_id?: number | null
          descuento_total?: number | null
          empleado_id?: number
          estado?: string | null
          fecha_hora?: string | null
          impuestos?: number
          subtotal?: number
          total?: number
          venta_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_cliente_venta"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "fk_corte_venta"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "cortescaja"
            referencedColumns: ["corte_id"]
          },
          {
            foreignKeyName: "fk_empleado_venta"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["empleado_id"]
          },
        ]
      }
      zz_diccionariocolumnas: {
        Row: {
          columna_id: number
          descripcion_columna: string | null
          es_fk: boolean | null
          es_pk: boolean | null
          fk_referencia_tabla: string | null
          nombre_columna: string
          reglas_negocio: string | null
          tabla_id: number
          tipo_dato: string
        }
        Insert: {
          columna_id?: number
          descripcion_columna?: string | null
          es_fk?: boolean | null
          es_pk?: boolean | null
          fk_referencia_tabla?: string | null
          nombre_columna: string
          reglas_negocio?: string | null
          tabla_id: number
          tipo_dato: string
        }
        Update: {
          columna_id?: number
          descripcion_columna?: string | null
          es_fk?: boolean | null
          es_pk?: boolean | null
          fk_referencia_tabla?: string | null
          nombre_columna?: string
          reglas_negocio?: string | null
          tabla_id?: number
          tipo_dato?: string
        }
        Relationships: [
          {
            foreignKeyName: "zz_diccionariocolumnas_tabla_id_fkey"
            columns: ["tabla_id"]
            isOneToOne: false
            referencedRelation: "zz_diccionariotablas"
            referencedColumns: ["tabla_id"]
          },
        ]
      }
      zz_diccionariotablas: {
        Row: {
          descripcion_funcional: string
          nombre_tabla: string
          tabla_id: number
        }
        Insert: {
          descripcion_funcional: string
          nombre_tabla: string
          tabla_id?: number
        }
        Update: {
          descripcion_funcional?: string
          nombre_tabla?: string
          tabla_id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      asignar_promocion_productos: {
        Args: { p_promocion_id: number; p_producto_ids: number[] }
        Returns: undefined
      }
      abrir_caja: {
        Args: {
          empleado_id_param: number
          saldo_inicial_param: number
          terminal_id_param: string
        }
        Returns: {
          corte_id: number
          fecha_hora_apertura: string
          saldo_inicial_efectivo: number
          terminal_id: string
        }[]
      }
      actualizar_empleado_directo: {
        Args: {
          empleado_id_param: number
          fecha_contratacion_param: string
          nombre_completo_param: string
          rol_id_param: number
          usuario_param: string
        }
        Returns: undefined
      }
      actualizar_producto:
        | {
            Args: {
              codigo_barras_param: string
              departamento_id_param: number
              descripcion_param: string
              precio_costo_param: number
              precio_venta_param: number
              producto_id_param: number
            }
            Returns: undefined
          }
        | {
            Args: {
              codigo_barras_param: string
              departamento_id_param: number
              descripcion_param: string
              precio_costo_param: number
              precio_venta_param: number
              producto_id_param: number
              tipo_producto_param: string
            }
            Returns: undefined
          }
        | {
            Args: {
              cantidad_actual_param: number
              codigo_barras_param: string
              departamento_id_param: number
              descripcion_param: string
              precio_costo_param: number
              precio_venta_param: number
              producto_id_param: number
              stock_minimo_param: number
              tipo_producto_param: string
            }
            Returns: undefined
          }
      actualizar_producto_con_promo: {
        Args: {
          codigo_barras_param: string
          departamento_id_param: number
          descripcion_param: string
          precio_costo_param: number
          precio_venta_param: number
          producto_id_param: number
          promocion_id_param: number
          stock_minimo_param: number
          tipo_producto_param: string
        }
        Returns: undefined
      }
      buscar_producto: {
        Args: { termino_busqueda: string }
        Returns: {
          codigo: string
          id_producto: number
          nombre_producto: string
          precio: number
          stock: number
        }[]
      }
      cancelar_producto_autorizado: {
        Args: {
          p_detalle_venta_id: number
          p_motivo: string
          p_supervisor_id: number
        }
        Returns: string
      }
      cancelar_venta_completa: { Args: { args: Json }; Returns: undefined }
      cerrar_caja: {
        Args: {
          corte_id_param: number
          resumen: Json
          saldo_final_real_param: number
        }
        Returns: undefined
      }
      crear_empleado_con_auth: {
        Args: {
          p_email: string
          p_fecha_contratacion?: string
          p_nombre: string
          p_password: string
          p_rol_id: number
        }
        Returns: number
      }
      crear_producto:
        | {
            Args: {
              codigo_barras_param: string
              departamento_id_param: number
              descripcion_param: string
              precio_costo_param: number
              precio_venta_param: number
            }
            Returns: number
          }
        | {
            Args: {
              codigo_barras_param: string
              departamento_id_param: number
              descripcion_param: string
              precio_costo_param: number
              precio_venta_param: number
              tipo_producto_param: string
            }
            Returns: number
          }
        | {
            Args: {
              cantidad_actual_param: number
              codigo_barras_param: string
              departamento_id_param: number
              descripcion_param: string
              precio_costo_param: number
              precio_venta_param: number
              stock_minimo_param: number
              tipo_producto_param: string
            }
            Returns: number
          }
      crear_producto_con_promo: {
        Args: {
          cantidad_actual_param: number
          codigo_barras_param: string
          departamento_id_param: number
          descripcion_param: string
          precio_costo_param: number
          precio_venta_param: number
          promocion_id_param: number
          stock_minimo_param: number
          tipo_producto_param: string
        }
        Returns: undefined
      }
      desactivar_empleado_directo: {
        Args: { empleado_id_param: number }
        Returns: undefined
      }
      exigir_admin: { Args: never; Returns: undefined }
      get_mi_perfil: {
        Args: never
        Returns: {
          email: string
          empleado_id: number
          nombre_completo: string
          nombre_rol: string
          rol_id: number
        }[]
      }
      mi_rol: { Args: never; Returns: string }
      obtener_detalle_venta: {
        Args: { venta_id_param: number }
        Returns: {
          cantidad: number
          descripcion: string
          importe_total: number
          precio_unitario: number
        }[]
      }
      obtener_estado_cuenta: {
        Args: { cliente_id_param: number }
        Returns: {
          fecha_hora: string
          monto: number
          notas: string
          saldo_nuevo: number
          tipo_movimiento: string
        }[]
      }
      obtener_historial_cortes: {
        Args: never
        Returns: {
          corte_id: number
          diferencia: number
          fecha_apertura: string
          fecha_cierre: string
          nombre_empleado: string
          saldo_final_real: number
          saldo_inicial: number
        }[]
      }
      obtener_resumen_corte: {
        Args: { corte_id_param: number }
        Returns: {
          total_general: number
          total_otros_pagos: number
          total_ventas_credito: number
          total_ventas_efectivo: number
          total_ventas_tarjeta: number
        }[]
      }
      obtener_ventas_por_corte: {
        Args: { corte_id_param: number }
        Returns: {
          fecha_hora: string
          nombre_cliente: string
          nombre_empleado: string
          total: number
          venta_id: number
        }[]
      }
      obtener_ventas_por_depto: {
        Args: { corte_id_param: number }
        Returns: {
          departamento_nombre: string
          total_vendido: number
        }[]
      }
      recibir_mercancia_proveedor: {
        Args: {
          p_cantidad: number
          p_empleado_id: number
          p_notas: string
          p_producto_id: number
        }
        Returns: string
      }
      registrar_abono_cliente: {
        Args: {
          cliente_id_param: number
          empleado_id_param: number
          monto_abono_param: number
        }
        Returns: undefined
      }
      registrar_entrada_stock: {
        Args: {
          cantidad_param: number
          empleado_id_param: number
          producto_id_param: number
        }
        Returns: undefined
      }
      registrar_nuevo_producto: {
        Args: {
          p_codigo_barras: string
          p_departamento_id: number
          p_descripcion: string
          p_precio_costo: number
          p_precio_venta: number
          p_stock_inicial: number
        }
        Returns: string
      }
      registrar_venta_completa: {
        Args: {
          carrito_param: Json
          cliente_id_param: number
          corte_id_param: number
          empleado_id_param: number
          metodo_pago_id_param: number
          ticket_id_param?: number | null
        }
        Returns: number
      }
      verificar_supervisor_auth: {
        Args: { p_email: string; p_password: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      detalle_venta_item: {
        producto_id: number | null
        cantidad: number | null
        precio_unitario_registrado: number | null
        impuesto_aplicado: number | null
        importe_total: number | null
        descripcion_registrada: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

