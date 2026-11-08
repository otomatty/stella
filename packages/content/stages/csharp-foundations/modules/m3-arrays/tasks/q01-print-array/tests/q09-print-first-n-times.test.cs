public class Q09PrintFirstNTimesTests
{
    [Fact(DisplayName = "Q09 先頭をN行出す")]
    public void Q09PrintFirstNTimes()
    {
        Assert.Equal("3\n3\n3\n", ConsoleOutput.Capture(() => Answers.Q09PrintFirstNTimes(new int[] { 3, 9, 4 }, 3)));
        Assert.Equal("5\n", ConsoleOutput.Capture(() => Answers.Q09PrintFirstNTimes(new int[] { 5 }, 1)));
        Assert.Equal("8\n8\n", ConsoleOutput.Capture(() => Answers.Q09PrintFirstNTimes(new int[] { 8, 1 }, 2)));
    }
}
