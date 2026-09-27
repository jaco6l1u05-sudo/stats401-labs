# One-minute presentation notes

This Our World in Data scatterplot compares inequality before and after taxes
and transfers. Its shared scales and equality line are useful, but the main
question is harder than it needs to be: how much does inequality fall in each
country? The viewer must estimate diagonal distance, many countries are not
labeled, and region colors compete with that comparison.

My redesign uses a dumbbell plot. Each country has two points on the same Gini
scale, and the connector directly shows the reduction. Every country is labeled,
the list can be sorted or filtered, and the tooltip reports the actual observation
year because the source combines data from 2011 to 2020. The redesign takes more
vertical space, but it makes ranking countries and comparing before-and-after
values much faster and more precise.
