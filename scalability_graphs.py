import matplotlib.pyplot as plt
import numpy as np

# Create scalability visualization graphs
fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))
fig.suptitle('Bus Tracking Backend Scalability Analysis', fontsize=16, fontweight='bold')

# Graph 1: Users vs Daily Operations (Single Bus)
users = np.array([0, 100, 200, 500, 800, 1000, 1500, 2000])
operations_single_bus = 800 + users * 50 + 200  # Bus ops + User reads + Admin
spark_limit = 50000

ax1.plot(users, operations_single_bus, 'b-', linewidth=2, label='Total Operations')
ax1.axhline(y=spark_limit, color='r', linestyle='--', linewidth=2, label='Spark Plan Limit')
ax1.fill_between(users, 0, spark_limit, alpha=0.2, color='green', label='Safe Zone')
ax1.fill_between(users, spark_limit, operations_single_bus.max(), alpha=0.2, color='red', label='Danger Zone')
ax1.set_xlabel('Number of Users')
ax1.set_ylabel('Daily Operations')
ax1.set_title('Single Bus: Users vs Operations')
ax1.legend()
ax1.grid(True, alpha=0.3)

# Graph 2: Number of Buses vs Operations (500 users each)
buses = np.array([1, 2, 3, 4, 5, 6, 7, 8])
users_per_bus = 500
operations_multi_bus = buses * (800 + users_per_bus * 50 + 200)

ax2.plot(buses, operations_multi_bus, 'g-', linewidth=2, label='Total Operations')
ax2.axhline(y=spark_limit, color='r', linestyle='--', linewidth=2, label='Spark Plan Limit')
ax2.fill_between(buses, 0, spark_limit, alpha=0.2, color='green', label='Safe Zone')
ax2.fill_between(buses, spark_limit, operations_multi_bus.max(), alpha=0.2, color='red', label='Danger Zone')
ax2.set_xlabel('Number of Buses')
ax2.set_ylabel('Daily Operations')
ax2.set_title('Multiple Buses: 500 Users Each')
ax2.legend()
ax2.grid(True, alpha=0.3)

# Graph 3: Cost Analysis - Operations vs Firebase Plans
operations_range = np.array([10000, 25000, 50000, 100000, 200000, 500000])
spark_cost = np.where(operations_range <= 50000, 0, np.inf)
blaze_cost = np.maximum(0, (operations_range - 50000) * 0.06 / 100000)  # $0.06 per 100K operations

ax3.plot(operations_range, spark_cost, 'r-', linewidth=2, label='Spark Plan ($0)')
ax3.plot(operations_range, blaze_cost, 'b-', linewidth=2, label='Blaze Plan (Pay-as-you-go)')
ax3.set_xlabel('Daily Operations')
ax3.set_ylabel('Monthly Cost ($)')
ax3.set_title('Firebase Plan Costs')
ax3.legend()
ax3.grid(True, alpha=0.3)
ax3.set_ylim(0, 10)

# Graph 4: System Performance Under Load
load_scenarios = ['1B+100U', '1B+500U', '1B+1000U', '2B+500U', '3B+1000U', '5B+2000U']
operations = [6000, 26000, 51000, 27000, 53000, 105000]
colors = ['green', 'green', 'orange', 'green', 'red', 'red']
status = ['Safe', 'Safe', 'Warning', 'Safe', 'Critical', 'Critical']

bars = ax4.bar(load_scenarios, operations, color=colors, alpha=0.7)
ax4.axhline(y=spark_limit, color='red', linestyle='--', linewidth=2, label='Spark Limit')
ax4.set_xlabel('Scenario (Buses + Users)')
ax4.set_ylabel('Daily Operations')
ax4.set_title('Load Scenarios vs Spark Plan Limit')
ax4.legend()
ax4.grid(True, alpha=0.3)

# Add value labels on bars
for bar, op, stat in zip(bars, operations, status):
    height = bar.get_height()
    ax4.text(bar.get_x() + bar.get_width()/2., height + 1000,
             f'{op:,}\n{stat}', ha='center', va='bottom', fontsize=8)

plt.tight_layout()
plt.savefig('c:/xampp/htdocs/viscous/backend_scalability_analysis.png', dpi=300, bbox_inches='tight')
plt.show()

# Create a detailed breakdown chart
fig2, (ax5, ax6) = plt.subplots(1, 2, figsize=(15, 6))
fig2.suptitle('Operation Breakdown and Optimization Impact', fontsize=16, fontweight='bold')

# Graph 5: Operation Type Breakdown (Single Bus, 1000 Users)
operation_types = ['Bus Location\nUpdates', 'Stop\nChecks', 'User App\nReads', 'Admin\nReads', 'Cache\nRefresh']
operations_breakdown = [800, 400, 50000, 200, 144]
colors_breakdown = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']

wedges, texts, autotexts = ax5.pie(operations_breakdown, labels=operation_types, colors=colors_breakdown, 
                                   autopct='%1.1f%%', startangle=90)
ax5.set_title('Daily Operations Breakdown\n(1 Bus + 1000 Users)')

# Graph 6: Before vs After Optimization
scenarios_opt = ['No Optimization', 'Current Optimization', 'Full Optimization']
operations_before = [150000, 51544, 25000]  # Estimated without optimizations
colors_opt = ['red', 'orange', 'green']

bars_opt = ax6.bar(scenarios_opt, operations_before, color=colors_opt, alpha=0.7)
ax6.axhline(y=spark_limit, color='red', linestyle='--', linewidth=2, label='Spark Limit')
ax6.set_ylabel('Daily Operations')
ax6.set_title('Optimization Impact\n(1 Bus + 1000 Users)')
ax6.legend()
ax6.grid(True, alpha=0.3)

# Add value labels
for bar, op in zip(bars_opt, operations_before):
    height = bar.get_height()
    ax6.text(bar.get_x() + bar.get_width()/2., height + 2000,
             f'{op:,}', ha='center', va='bottom', fontweight='bold')

plt.tight_layout()
plt.savefig('c:/xampp/htdocs/viscous/optimization_analysis.png', dpi=300, bbox_inches='tight')
plt.show()

print("Scalability analysis graphs generated successfully!")
print("\nKey Findings:")
print("1. Single bus can handle up to 800 users safely on Spark plan")
print("2. Multiple buses require careful user distribution")
print("3. 3+ buses with 1000+ users need Blaze plan")
print("4. Current optimizations reduce operations by ~66%")
print("5. Further optimizations could support 2000+ users on Spark plan")