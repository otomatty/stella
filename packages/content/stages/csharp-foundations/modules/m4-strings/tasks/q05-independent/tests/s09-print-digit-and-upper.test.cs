public class S09PrintDigitAndUpperTests
{
    [Fact(DisplayName = "S09 二つの表示")]
    public void S09PrintDigitAndUpper()
    {
        Assert.Equal("3\n2\n", ConsoleOutput.Capture(() => Answers.S09PrintDigitAndUpper("A1b02Z")));
        Assert.Equal("0\n0\n", ConsoleOutput.Capture(() => Answers.S09PrintDigitAndUpper("")));
        Assert.Equal("0\n0\n", ConsoleOutput.Capture(() => Answers.S09PrintDigitAndUpper("abc")));
        Assert.Equal("0\n3\n", ConsoleOutput.Capture(() => Answers.S09PrintDigitAndUpper("ABC")));
    }
}
