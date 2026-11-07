public class Q08PrintDoubledTests
{
    [Fact(DisplayName = "Q08 各要素を2倍して出す")]
    public void Q08PrintDoubled()
    {
        Assert.Equal("6\n18\n8\n", ConsoleOutput.Capture(() => Answers.Q08PrintDoubled(new int[] { 3, 9, 4 })));
        Assert.Equal("0\n", ConsoleOutput.Capture(() => Answers.Q08PrintDoubled(new int[] { 0 })));
        Assert.Equal("2\n2\n2\n", ConsoleOutput.Capture(() => Answers.Q08PrintDoubled(new int[] { 1, 1, 1 })));
    }
}
