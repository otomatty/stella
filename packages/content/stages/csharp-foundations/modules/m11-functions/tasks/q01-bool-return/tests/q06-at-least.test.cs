public class Q06AtLeastTests
{
    [Fact(DisplayName = "Q06 N以上か")]
    public void Q06AtLeast()
    {
        Assert.Equal(true, Answers.Q06AtLeast(60, 60));
        Assert.Equal(false, Answers.Q06AtLeast(59, 60));
    }
}
