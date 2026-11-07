public class S06PrintNegCountAndNonnegSumTests
{
    [Fact(DisplayName = "S06 二つの答え")]
    public void S06PrintNegCountAndNonnegSum()
    {
        Assert.Equal("2\n4\n", ConsoleOutput.Capture(() => Answers.S06PrintNegCountAndNonnegSum(new int[] { -2, 0, 4, -1 })));
        Assert.Equal("0\n0\n", ConsoleOutput.Capture(() => Answers.S06PrintNegCountAndNonnegSum(new int[] { })));
        Assert.Equal("0\n3\n", ConsoleOutput.Capture(() => Answers.S06PrintNegCountAndNonnegSum(new int[] { 1, 2 })));
        Assert.Equal("1\n0\n", ConsoleOutput.Capture(() => Answers.S06PrintNegCountAndNonnegSum(new int[] { -1 })));
    }
}
