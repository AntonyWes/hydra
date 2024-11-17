import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("hardware")
export class Hardware {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("text", { nullable: true })
  cpuName: string | null;

  @Column("text", { nullable: true })
  gpuName: string | null;

  @Column("int", { nullable: true })
  ramSize: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
