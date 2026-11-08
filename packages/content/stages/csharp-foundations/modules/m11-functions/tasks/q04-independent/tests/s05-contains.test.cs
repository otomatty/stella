public class S05ContainsTests
{
    [Fact(DisplayName = "S05 含むか")]
    public void S05Contains()
    {
        Assert.Equal(true, Answers.S05Contains(new int[] { 2, 7, 2 }, 7));
        Assert.Equal(false, Answers.S05Contains(new int[] { }, 7));
        Assert.Equal(true, Answers.S05Contains(new int[] { 7 }, 7));
        Assert.Equal(false, Answers.S05Contains(new int[] { 1, 2 }, 7));
    }
}
