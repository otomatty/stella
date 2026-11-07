public class Q14PrintSumAndMaxTests
{
    [Fact(DisplayName = "Q14 合計と最大を2行")]
    public void Q14PrintSumAndMax()
    {
        Assert.Equal("16\n9\n", ConsoleOutput.Capture(() => Answers.Q14PrintSumAndMax(new int[] { 3, 9, 4 })));
        Assert.Equal("5\n5\n", ConsoleOutput.Capture(() => Answers.Q14PrintSumAndMax(new int[] { 5 })));
    }
}
